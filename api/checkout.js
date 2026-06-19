// api/checkout.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(455).json({ error: 'Método no permitido' });
    }

    const { userId, email, nombre, apellido } = req.body;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['customer_balance'],
            customer_email: email,
            payment_method_options: {
                customer_balance: {
                    funding_type: 'bank_transfer',
                    bank_transfer: {
                        type: 'mx_bank_transfer',
                    },
                },
            },
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID, // Configurado en las variables de Vercel
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin}/?pago=pendiente`,
            cancel_url: `${req.headers.origin}/?pago=cancelado`,
            metadata: {
                userId: userId,
                nombreCompleto: `${nombre} ${apellido}`
            }
        });

        return res.status(200).json({ id: session.id });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};