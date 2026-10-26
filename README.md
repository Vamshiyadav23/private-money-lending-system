# FinTrack — Private Money Lending Management System

**FinTrack** is a full-stack web application designed to help independent money lenders manage borrowers, loans, repayments, and outstanding balances in one place. It replaces manual notebooks and spreadsheets with a centralized system for tracking financial transactions and monitoring loan status.

## 🚀 Features

- **Borrower Management** — Add, view, update, and manage borrower information.
- **Loan Management** — Create and manage loans, including principal, interest, total amount due, and outstanding balance.
- **Repayment Tracking** — Record payments with the date and amount received.
- **Automatic Balance Updates** — Update a loan's remaining balance when a repayment is recorded.
- **Flexible Repayments** — Support payments that vary in amount rather than relying exclusively on fixed daily installments.
- **Loan Status Management** — Track active and completed loans based on repayment progress.
- **Repayment History** — Maintain transaction records to review payments made by borrowers.
- **Dashboard** — View key lending information in a centralized interface.
- **Reports and Notifications** — Access repayment-related information and monitor pending or overdue payments.

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| API Communication | REST APIs |
| Version Control | Git, GitHub |

## 🏗️ Architecture

The application follows a client-server architecture.

1. **React frontend:** Provides the user interface for managing borrowers, loans, and repayments.
2. **Express backend:** Exposes REST API endpoints and handles business logic.
3. **MongoDB database:** Stores borrower, loan, and repayment records.
4. **API integration:** Connects frontend operations to the backend for creating, retrieving, updating, and deleting records.

## 📁 Project Structure

```text
private-money-lending-system/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── server.js
├── src/
│   ├── components/
│   │   ├── BorrowerManagement.js
│   │   ├── BorrowerProfile.js
│   │   ├── Notifications.js
│   │   ├── RepaymentManager.js
│   │   └── ...
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   └── ...
├── package.json
└── README.md
```

## 🔮 Future Improvements

FinTrack can be extended with advanced financial analytics, intelligent automation, improved security, and scalable infrastructure.

### 1. 🤖 AI-Powered Lending Intelligence
- **Repayment Risk Prediction:** Use machine learning to identify loans that may become overdue based on historical repayment patterns.
- **Borrower Behavior Analytics:** Analyze payment consistency, missed payments, and repayment trends.
- **Smart Collection Prioritization:** Rank pending collections based on overdue duration, outstanding balance, and repayment history.
- **Cash Flow Forecasting:** Predict expected collections and future cash availability using historical payment data.

### 2. 📊 Advanced Analytics and Reporting
- Interactive dashboards showing total lending, collections, outstanding balances, and overdue amounts.
- Monthly, quarterly, and yearly financial reports.
- Portfolio performance analysis and loan completion trends.
- Exportable reports in PDF, Excel, and CSV formats.
- Historical comparisons to identify changes in collection performance.

### 3. 📱 Automated Notifications
- WhatsApp, SMS, and email reminders for upcoming and overdue repayments.
- Automated payment receipts and transaction confirmations.
- Customizable notification schedules and message templates.
- Delivery status tracking and retry mechanisms for failed notifications.

### 4. 🔐 Security and Access Control
- Secure user authentication and password hashing.
- Role-based access control for administrators and collection agents.
- JWT-based authentication with appropriate token expiration and refresh handling.
- Input validation, rate limiting, and protection against common web vulnerabilities.
- Audit logs for loan modifications, repayments, and account activities.

### 5. 💳 Digital Payment Integration
- Integrate supported payment gateways or UPI payment flows.
- Generate payment links for borrowers.
- Automatically reconcile confirmed online payments with repayment records.
- Generate digital receipts and downloadable borrower statements.
- Prevent duplicate payment processing through idempotent transaction handling.

### 6. 📅 Flexible Repayment Management
- Support daily, weekly, monthly, and custom repayment schedules.
- Record partial payments, advance payments, and multiple payments on the same day.
- Track missed payments and accumulated outstanding amounts.
- Maintain a complete transaction history with correction and reversal records.
- Separate scheduled installments from actual payments to prevent double counting.

### 7. ☁️ Cloud Deployment and Scalability
- Deploy the frontend and backend to reliable cloud hosting platforms.
- Use managed MongoDB hosting with automated backups.
- Configure CI/CD

## ⚙️ Getting Started

### Prerequisites

Install the following before running the application:

- Node.js and npm
- MongoDB, either locally or through MongoDB Atlas
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Vamshiyadav23/private-money-lending-system.git
cd private-money-lending-system
```

### 2. Configure the Backend

Navigate to the backend directory:

```bash
cd backend
npm install
```

Configure the MongoDB connection string and any required environment variables according to the backend configuration.

If your backend uses a `.env` file, configure the appropriate values, for example:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
```

Use the actual environment variable names expected by your application. Never commit database credentials or secrets to GitHub.

Start the backend using the script configured in `backend/package.json`. For example, if a `start` script exists:

```bash
npm start
```

### 3. Configure the Frontend

Open a second terminal and navigate to the project root:

```bash
cd private-money-lending-system
npm install
npm start
```

Use the frontend start command defined in your root `package.json`. If the project uses a different script, such as `dev`, run that instead.

Ensure the frontend API configuration points to the correct backend URL.

## 💡 How It Works

1. Add a borrower and maintain their details.
2. Create a loan with the applicable loan amount, interest, and repayment terms.
3. Record the amount actually received whenever the borrower makes a payment.
4. Automatically update the outstanding balance based on the recorded repayment.
5. Review repayment history and monitor the loan until the amount due has been collected.

**Example:** If a borrower owes ₹20,000 and pays ₹500, the remaining balance becomes ₹19,500, assuming the payment is applied entirely toward the outstanding amount and no additional charges apply.

## 🔐 Data Integrity

The application uses a database-backed architecture to manage borrower, loan, and repayment records. Related records should be handled consistently when loans or borrowers are updated or deleted. Repayment history should be preserved or deleted only according to an intentional data-retention policy.

## 🔮 Future Enhancements

- Role-based authentication and authorization
- Advanced financial reports and portfolio analytics
- Cash-flow forecasting and repayment-risk insights
- Automated WhatsApp or SMS payment reminders
- Downloadable receipts and borrower statements
- Cloud deployment and automated CI/CD
- Improved audit logs and data recovery

## 🎯 Project Objective

The goal of FinTrack is to simplify day-to-day lending operations for small, independent lenders by reducing manual record-keeping, improving repayment visibility, and making outstanding balances easier to manage.

## 👨‍💻 Author

**Vamshi Yadav**

GitHub: [@Vamshiyadav23](https://github.com/Vamshiyadav23)

---

*FinTrack is a software project for lending record management. It is not a banking platform or a substitute for legal, financial, or regulatory advice.*
