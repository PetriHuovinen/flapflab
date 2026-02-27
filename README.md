# Flappy Bird Clone with Stripe Payments

A fun flappy bird game with in-game currency and Stripe payment integration for real-money purchases.

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Stripe account (https://stripe.com)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Update environment variables:**
   - Copy `.env.example` to `.env`
   - Replace the placeholder values with your actual Stripe API keys:
     ```
     STRIPE_SECRET_KEY=sk_test_your_actual_secret_key
     STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key
     PORT=3000
     ```
   
   > To get your API keys:
   > 1. Log in to your Stripe Dashboard
   > 2. Go to Developers > API Keys
   > 3. Copy your Test or Live keys (Test keys are recommended for development)

3. **Start the server:**
```bash
npm start
```

4. **Open the game:**
   - Navigate to `http://localhost:3000` in your browser
   - The game will be fully functional with Stripe payment integration

## Features

### In-Game Currency
- Start with 500 free coins
- Earn bonus coins by reaching score milestones:
  - Score 10 → +$50
  - Score 25 → +$125
  - Score 50 → +$250

### Power-Ups Available
- **+10% Flap**: $0.99 (or 99 coins)
- **+25% Flap**: $1.99 (or 199 coins)
- **+50% Flap**: $3.99 (or 399 coins)
- **Double Flap**: $7.99 (or 799 coins)

### Payment Options
- **Free Currency**: If you have enough coins, purchases use in-game currency automatically
- **Real Money**: If you don't have enough coins, you can purchase with a credit/debit card via Stripe

## How to Play

1. Click or press Space to make the bird flap
2. Navigate through the pipes without hitting them
3. Earn coins based on your score
4. Use coins to buy power-ups or pay with real money
5. Power-ups increase your flap strength, making it easier to navigate

## Payment Testing

The `.env` file includes Stripe test keys. You can test payments using these test card numbers:

- **Successful payment**: 4242 4242 4242 4242
- **Payment decline**: 4000 0000 0000 0002
- **Use any future expiry date and any 3-digit CVC**

> ⚠️ **Important**: Never use real credit card information during testing. Always use the Stripe test card numbers provided above.

## File Structure

```
flapflab/
├── server.js           # Express server with Stripe integration
├── game.js             # Game logic and Stripe payment handling
├── index.html          # HTML structure with payment modal
├── styles.css          # Styling including payment modal styles
├── package.json        # Node dependencies
├── .env                # Environment variables (Do not commit)
├── .env.example        # Example environment variables
└── README.md           # This file
```

## API Endpoints

- `POST /create-payment-intent` - Creates a Stripe payment intent
  - Request: `{ amount: number (cents), packageId: number }`
  - Response: `{ clientSecret: string, success: boolean }`

- `POST /webhook` - Handles Stripe webhook events
  - Listens for `payment_intent.succeeded` events

- `GET /config` - Returns Stripe publishable key
  - Response: `{ publishableKey: string }`

## Deployment

When deploying to production:

1. Update your `.env` file with **live** Stripe API keys
2. Set the `PORT` environment variable to your production port
3. Set up Stripe webhooks to your production server URL
4. Test thoroughly with Stripe's live test mode before taking real payments

## Troubleshooting

**Payment modal not appearing:**
- Check browser console for errors
- Ensure Stripe.js is loaded from the CDN
- Verify `publishableKey` is correct in environment variables

**Payment fails with "Missing amount or packageId":**
- Ensure the payment form is submitting correct data
- Check network tab in browser developer tools

**Backend connection errors:**
- Verify the server is running on the correct port
- Check CORS configuration if frontend and backend are on different domains
- Ensure `.env` file is in the correct location

## Security Notes

- Never commit `.env` to version control
- Always use HTTPS in production
- Stripe handles PCI compliance for card data
- Card details are not stored on your server
- Use webhooks to confirm payments on the backend

## License

ISC
