import jwt from "jsonwebtoken";
import validator from "validator";
import bcrypt from "bcryptjs";
import crypto, { randomUUID } from "crypto";
import db from "../model/db/db.js";
// import { sendEmailVerification } from "../utilities/verifyEmailAddress.js";
import { generateOtpEmail, sendRequestMail } from "../utilities/mailer.js";

const refreshTokenExpireTime = 60 * 60 * 24 * 7;
const OTP_TTL_MINUTES = 10;
const VERIFICATION_TOKEN_TTL_MINUTES = 15;

const createToken = async (id) => {
  return jwt.sign({ id }, process.env.SECRET, { expiresIn: "2d" });
};

const createRefreshToken = async (payload, jti) => {
  return jwt.sign({ ...payload, jti }, process.env.REFRESH_SECRET, {
    expiresIn: refreshTokenExpireTime,
  });
};

const sendCookies = (res, refreshToken) => {
  res.cookie("rt", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    path: "auth/refresh",
    maxAge: refreshTokenExpireTime,
  });
};

const persistToken = async (jti, user_id, refresh_token) => {
  const salt = await bcrypt.genSalt(10);
  const hashed_token = await bcrypt.hash(refresh_token, salt);
  const date = new Date(Date.now() + refreshTokenExpireTime);

  try {
    const { rows: refreshToken } = await db.query(
      "INSERT INTO refresh_token(jti,user_id,hashed_token,revoked,expires_at) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [jti, user_id, hashed_token, false, date]
    );

    return {
      succes: true,
      ...refreshToken,
    };
  } catch (err) {
    console.log("Error occured while persisting Token", err);

    return {
      success: false,
      error: err,
    };
  }
};

const verifyToken = (refresh_token) => {
  return jwt.verify(refresh_token, process.env.REFRESH_SECRECT);
};

const validateToken = async (jti) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM refresh_token WHERE revoked = $1 AND jti = $2",
      [false, jti]
    );

    return {
      succes: true,
      ...rows,
    };
  } catch (err) {
    console.log("Error occured while validating Token", err);

    return {
      success: false,
      error: err,
    };
  }
};

const revokeToken = async (jti) => {
  try {
    const { rows } = await db.query(
      "UPDATE refresh_token SET revoked = $1 WHERE jti = $2 RETURNING *",
      [true, jti]
    );
    return {
      succes: true,
      ...rows,
    };
  } catch (err) {
    console.log("Error occured while revoking Token", err);

    return {
      success: false,
      error: err,
    };
  }
};

export const getMe = async (req, res) => {
  try {
    const userId = req.user_id;

    const result = await db.query(
      "SELECT user_id, email, mobile, referrer_id FROM customers WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
    console.log("from get me", result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const signInWithGoogle = async (req, res) => {
  const { uuid, email } = req.user;
  console.log(uuid);
  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress;

  if (!validator.isUUID(uuid) && validator.isEmpty(uuid)) {
    return res.status(400).json({ error: "Invalid UUID" });
  }

  try {
    const { rows: checkUserExist } = await db.query(
      "SELECT * FROM customers WHERE email = $1 AND firebase_uid = $2",
      [email, uuid]
    );

    if (checkUserExist > 0) {
      const id = checkUserExist[0].user_id;
      const token = await createToken(id);
      return res
        .status(200)
        .json({ error: "Logged in with Google", data: token });
    }

    const { rows } = await db.query(
      "INSERT INTO customers(email, firebase_uid, ip_address) VALUES($1,$2,$3) RETURNING *",
      [email, uuid, ip]
    );

    const jti = randomUUID();
    const userId = rows[0].id;
    const token = await createToken(userId);
    const refreshToken = await createRefreshToken(userId, jti);

    //persist Token
    await persistToken(jti, userId, refreshToken);
    //setRefreshCookies
    sendCookies(res, refreshToken);

    const userEmail = rows[0].email;
    const imageURL = rows[0].avatar_url;

    return res
      .status(201)
      .json({
        message: "Succesfully created an Account",
        data: {
          token: token,
          user: { email: userEmail, avatar_url: imageURL },
        },
      });
  } catch (err) {
    console.log("Error Occured while creating Account", err);
    return res
      .status(500)
      .json({ message: "System Error while creating account", error: err });
  }
};

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress;

  console.log(ip);
  if (!name) {
    return res.status(400).json({ error: "Invalid Name" });
  }
  if (!validator.isEmail(email) && validator.isEmpty(email)) {
    return res.status(400).json({ error: "Invalid Email" });
  }

  if (validator.isEmpty(name)) {
    return res.status(400).json({ error: "Invalid First Name" });
  }

  if (!validator.isStrongPassword(password) && validator.isEmpty(password)) {
    return res.status(400).json({ error: "Invalid Password" });
  }
  try {
    const { rows: checkUserExist } = await db.query(
      "SELECT * FROM customers WHERE email =$1",
      [email]
    );

    if (checkUserExist.length > 0)
      return res.status(400).json({ error: "User already exist" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const { rows } = await db.query(
      "INSERT INTO customers(email, password, ip_address) VALUES($1,$2,$3) RETURNING *",
      [email, hashed, ip]
    );

    if (!rows) {
      return res.status(400).json({ error: "An error occured" });
    }

    const userId = rows[0].id;
    //EmailVerification
    //Create token
    const emailToken = crypto.randomBytes(32).toString("hex");
    const link = `${req.protocol}://${req.host}/api/email-verification?token=${emailToken}&email=${email}`;

    //Send Email
    // const result = await sendEmailVerification({ email, link, name });
    let result
    if (!result.success)
      return res
        .status(400)
        .json({ error: "Error sending email verification" });
    await db.query(
      "INSERT INTO user_verification(user_id, token, email, expires_at) VALUES($1,$2, $3, NOW() + INTERVAL '30 minutes')",
      [userId, emailToken, email]
    );

    const jti = randomUUID();
    const token = await createToken(userId);
    const refreshToken = await createRefreshToken(userId, jti);

    //persist Token
    await persistToken(jti, userId, refreshToken);
    //setRefreshCookies
    sendCookies(res, refreshToken);

    const userEmail = rows[0].email;
    const imageURL = rows[0].avatar_url;

    return res.status(201).json({
      message: "Succesfully created an Account",
      data: {
        token: token,
        user: { email: userEmail, avatar_url: imageURL },
      },
    });
  } catch (err) {
    console.log("Error Occured while creating Account", err);
    return res
      .status(500)
      .json({ message: "System Error while creating account", error: err });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  //   const ip = req.ip;

  if (!validator.isEmail(email) && validator.isEmpty(email)) {
    return res.status(400).json({ error: "Invalid Email" });
  }

  if (!validator.isStrongPassword(password) && validator.isEmpty(password)) {
    return res.status(400).json({ error: "Invalid Password" });
  }
  try {
    const { rows: checkUserExist } = await db.query(
      "SELECT * FROM customers WHERE email =$1",
      [email]
    );

    if (checkUserExist.length == 0)
      return res.status(400).json({ error: "User does not exist" });

    const hashed = checkUserExist[0].password;
    const match = await bcrypt.compare(password, hashed);

    if (!match) {
      return res.status(400).json({ error: "Password Does not Match" });
    }
    const jti = randomUUID();
    const userId = checkUserExist[0].id;
    const token = await createToken(userId);
    const refreshToken = await createRefreshToken(userId, jti);
    //Test Refresh Token
    console.log(refreshToken);

    //persist Token
    await persistToken(jti, userId, refreshToken);
    //setRefreshCookies
    sendCookies(res, refreshToken);

    const userEmail = checkUserExist[0].email;
    const referal_code = checkUserExist[0].referal_code;

    return res.status(200).json({
      message: "Succesfully Logged into Account",
      data: {
        token: token,
        user: { email: userEmail, referal_code: referal_code },
      },
    });
  } catch (err) {
    console.log("Error Occured while loggin Account", err);
    return res.status(500).json({ error: "System Error while loggin account" });
  }
};

export const createPassword = async (req, res) => {
      const { email, password } = req.body;
      //   const ip = req.ip;

      if (!validator.isEmail(email) && validator.isEmpty(email)) {
        return res.status(400).json({ error: "Invalid Email" });
      }

      if (
        !validator.isStrongPassword(password) &&
        validator.isEmpty(password)
      ) {
        return res.status(400).json({ error: "Invalid Password" });
      }
      try {
        const { rows: checkUserExist } = await db.query(
          "SELECT * FROM customers WHERE email =$1",
          [email]
        );

        if (checkUserExist.length == 0)
          return res.status(400).json({ error: "User does not exist" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const { rows } = await db.query(
      "INSERT INTO customers(email, password) VALUES($1,$2) RETURNING *",
      [email, hashed]
    );

    if (!rows) {
      return res.status(400).json({ error: "An error occured" });
    }
        const jti = randomUUID();
        const userId = checkUserExist[0].id;
        const token = await createToken(userId);
        const refreshToken = await createRefreshToken(userId, jti);
        //Test Refresh Token
        console.log(refreshToken);

        //persist Token
        await persistToken(jti, userId, refreshToken);
        //setRefreshCookies
        sendCookies(res, refreshToken);

        const userEmail = checkUserExist[0].email;
        const imageURL = checkUserExist[0].avatar_url;

        return res.status(200).json({
          message: "Succesfully Created Password",
          data: {
            token: token,
            user: { email: userEmail, avatar_url: imageURL },
          },
        });
      } catch (err) {
        console.log("Error Occured while creating Password", err);
        return res
          .status(500)
          .json({ error: "System Error while creating Password" });
      }
}

export const requestOTP = async (req,res) => {
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });

          const { rows: checkUserExist } = await db.query(
            "SELECT email FROM customers WHERE email =$1",
            [email.toLowerCase()]
          );

          if (checkUserExist.length == 0)
            return res.status(400).json({ error: "User does not exist" });

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  try {
    // store otp (in production: store hashed OTP)
    await db.query(
      `INSERT INTO email_otps (email, otp, expires_at) VALUES ($1, $2, $3)`,
      [email.toLowerCase(), otp, expiresAt]
    );

    await sendRequestMail(
      {
            to: email,
            subject: "OTP Verification",
            bcc: "info@laundryaid.com.ng",
            html: generateOtpEmail({
              otp,
            }),
          }
    )

    return res.json({ ok: true, message: "OTP sent if email exists" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal error" });
  }
}

export const otpLogin = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "email and otp required" });

  try {
    // Find valid, unused OTP
    const { rows } = await db.query(
      `SELECT id FROM email_otps
       WHERE email = $1 AND otp = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase(), otp]
    );

    if (!rows.length) return res.status(400).json({ error: "Invalid or expired OTP" });

    // Mark OTP as used
    await db.query("UPDATE email_otps SET used = true WHERE id = $1", [rows[0].id]);

    // Find customer (must exist — created on first booking)
    const { rows: customers } = await db.query(
      "SELECT user_id, email, mobile, referrer_id FROM customers WHERE email = $1",
      [email.toLowerCase()]
    );

    if (!customers.length) {
      return res.status(404).json({ error: "No account found. Please make a booking first." });
    }

    const customer = customers[0];
    const token = await createToken(customer.user_id);

    return res.status(200).json({
      message: "Logged in successfully",
      data: {
        token,
        user: {
          email: customer.email,
          mobile: customer.mobile,
          referralCode: customer.referrer_id,
        },
      },
    });
  } catch (err) {
    console.error("OTP login error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
};


export const authRefresh = async (req, res) => {
  const token = req.cookies?.rt;
  if (!token) return res.status(401).json({ error: "Missing refresh token" });

  try {
    const payload = verifyToken(token);
    const record = await validateToken(payload.jti);
    if (!record.success)
      return res.status(401).json({ error: "Invalid Refresh token" });

    //Rotate
    await revokeToken(payload.jti);
    const userId = payload.id;
    const token = await createToken(userId);
    const refreshToken = await createRefreshToken(userId, jti);

    //persist Token
    await persistToken(jti, userId, refreshToken);
    //setRefreshCookies
    sendCookies(res, refreshToken);
    return res
      .status(200)
      .json({
        message: "suucessfully created token",
        data: { accessTiken: token },
      });
  } catch (err) {
    return res.status(401).json({ error: "invalid refresh token" });
  }
};

export const logout = async (req, res) => {
  const token = req.cookies?.rt;
  if (token) {
    try {
      const payload = verifyToken(token);
      await revokeToken(payload.jti);
    } catch (error) {}
  }

  res.clearCookies("rt", { path: "auth/refresh" });
  res.status(204).send();
};

export const verifyEmail = async (req, res) => {
  const { token, email } = req.query;

  //   SELECT * FROM user_verification
  // WHERE token = $1 AND expires_at > NOW();
  // DELETE FROM user_verification
  // WHERE expires_at < NOW();

  try {
    // 1. Check if token exists
    const { rows: tokenValue } = await db.query(
      "SELECT token FROM user_verification WHERE token = $1 AND email = $2",
      [token, email]
    );

    if (tokenValue.length === 0) {
      return res.status(400).json({ error: "Invalid Token" });
    }

    // 2. Check if token is expired and delete it if so
    const { rowCount: deletedCount } = await db.query(
      `DELETE FROM user_verification 
         WHERE created_at < NOW() - INTERVAL '30 minutes' 
         AND token = $1 AND email = $2`,
      [token, email]
    );

    if (deletedCount > 0) {
      return res.status(400).json({ error: "Expired Token" });
    }

    // 3. Mark user as verified
    await db.query("UPDATE customers SET email_verified = TRUE WHERE email = $1", [
      email,
    ]);

    // 4. Optionally delete the verification token
    await db.query(
      "DELETE FROM user_verification WHERE token = $1 AND email = $2",
      [token, email]
    );

    return res.status(200).json({ message: "Email Verified" });
  } catch (error) {
    console.error("Error occurred while verifying email:", error);
    return res
      .status(500)
      .json({ error: "System Error while verifying email" });
  }
};

export const resendEmailVerification = async (req, res) => {
  const { token } = req.param;
  try {
  } catch (error) {}
};
