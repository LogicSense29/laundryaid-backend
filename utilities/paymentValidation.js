const confirmPayment = async () => {
    try {
        await db.query('INSERT INTO payment(user_id, refrence) VALUES($1,$2)', [user_id, refrence])
    } catch(err) {

    }
}