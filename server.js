require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Log startup info
console.log('Starting Flappy Bird Game Server...');
console.log(`Stripe Secret Key configured: ${process.env.STRIPE_SECRET_KEY ? `Yes (${process.env.STRIPE_SECRET_KEY.substring(0, 10)}...)` : 'NO - SET STRIPE_SECRET_KEY'}`);
console.log(`Port: ${PORT}`);

// Middleware - order matters!
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes - must come before static files
// Stripe payment intent endpoint
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, packageId } = req.body;

        if (!amount || !packageId) {
            return res.status(400).json({ error: 'Missing amount or packageId' });
        }

        // Validate amount is a number
        const amountInCents = parseInt(amount);
        if (isNaN(amountInCents) || amountInCents < 50) {
            return res.status(400).json({ error: 'Invalid amount. Minimum is $0.50 (50 cents)' });
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            metadata: {
                packageId: packageId
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            success: true
        });
    } catch (error) {
        console.error('Error creating payment intent:');
        console.error(`  Message: ${error.message}`);
        console.error(`  Type: ${error.type}`);
        if (error.code) console.error(`  Code: ${error.code}`);
        
        // Return meaningful error to client
        const errorMessage = error.message.includes('Invalid API Key') 
            ? 'Invalid Stripe API key. Please configure STRIPE_SECRET_KEY in .env'
            : error.message;
        
        res.status(500).json({ error: errorMessage });
    }
});

// Static files - must come after API routes
app.use(express.static(path.join(__dirname)));

// Webhook endpoint for Stripe events
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test' // Update with actual webhook secret
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle payment intent succeeded
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        // Here you could update your database with the successful payment
    }

    res.json({received: true});
});

// Get Stripe publishable key
app.get('/config', (req, res) => {
    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

app.listen(PORT, () => {
    console.log(`✓ Server is running on http://localhost:${PORT}`);
    console.log(`✓ Payment endpoint: POST /create-payment-intent`);
    console.log(`✓ Config endpoint: GET /config`);
});
