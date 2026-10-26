
import React, { useEffect, useMemo, useState } from 'react';
import { repaymentAPI } from '../services/api';
import './RepaymentManager.css';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0));

const idOf = (value) =>
  value && typeof value === 'object'
    ? value._id || value.id
    : value;

const today = () => {
  const now = new Date();
  return new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);
};

const dateText = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN');
};

export default function RepaymentManager({
  loans = [],
  repayments = [],
  refreshData,
}) {
  const [loanId, setLoanId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeRepayments = Array.isArray(repayments) ? repayments : [];

  useEffect(() => {
    const exists = safeLoans.some(
      (loan) => String(idOf(loan)) === String(loanId)
    );

    if (loanId && exists) return;

    const openLoan = safeLoans.find((loan) => {
      const total = Number(loan.totalDue ?? loan.principal ?? 0);
      const paid = Number(loan.paidAmount ?? 0);
      const balance = Number(loan.remainingAmount ?? total - paid);

      return (
        loan.status !== 'completed' &&
        loan.status !== 'cancelled' &&
        balance > 0
      );
    });

    const selected = openLoan || safeLoans[0];
    setLoanId(selected ? String(idOf(selected)) : '');
  }, [safeLoans, loanId]);

  const loan = safeLoans.find(
    (item) => String(idOf(item)) === String(loanId)
  );

  const totalDue = Number(loan?.totalDue ?? loan?.principal ?? 0);
  const collected = Number(loan?.paidAmount ?? 0);
  const remaining = Math.max(
    0,
    Number(loan?.remainingAmount ?? totalDue - collected)
  );

  const history = useMemo(
    () =>
      safeRepayments
        .filter(
          (item) => String(idOf(item.loanId)) === String(loanId)
        )
        .sort(
          (a, b) =>
            new Date(b.paymentDate || b.dueDate || b.createdAt || 0) -
            new Date(a.paymentDate || a.dueDate || a.createdAt || 0)
        ),
    [safeRepayments, loanId]
  );

  const clearForm = () => {
    setAmount('');
    setPaymentDate(today());
    setNotes('');
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const payment = Number(amount);

    if (!loanId) {
      setError('Please select a loan.');
      return;
    }

    if (!Number.isFinite(payment) || payment <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }

    if (!paymentDate) {
      setError('Select the payment date.');
      return;
    }

    if (payment > remaining) {
      setError(`Payment cannot exceed ${money(remaining)}.`);
      return;
    }

    setLoading(true);

    try {
      await repaymentAPI.create({
        loanId,
        amount: payment,
        paymentDate,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });

      setMessage(`Payment of ${money(payment)} recorded successfully.`);
      clearForm();

      if (typeof refreshData === 'function') {
        await refreshData();
      }
    } catch (err) {
      setError(err.message || 'Could not record payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="repayment-manager">
      <header className="rm-header">
        <h2>Repayment Management</h2>
        <p>Record payments and track outstanding balances.</p>
      </header>

      {message && (
        <div className="rm-alert rm-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="rm-alert rm-error" role="alert">
          {error}
        </div>
      )}

      <div className="rm-card">
        <label className="rm-label" htmlFor="repayment-loan">
          Select loan
        </label>
        <select
          id="repayment-loan"
          className="rm-input"
          value={loanId}
          onChange={(event) => {
            setLoanId(event.target.value);
            setMessage('');
            setError('');
            clearForm();
          }}
        >
          <option value="">Choose a loan</option>
          {safeLoans.map((item) => (
            <option key={idOf(item)} value={idOf(item)}>
              {(item.borrowerName || 'Borrower') +
                ' — ' +
                money(item.totalDue ?? item.principal)}
            </option>
          ))}
        </select>
      </div>

      {loan ? (
        <>
          <div className="rm-grid">
            <div className="rm-card">
              <span className="rm-stat-label">Total amount due</span>
              <strong className="rm-stat-value">
                {money(totalDue)}
              </strong>
            </div>
            <div className="rm-card">
              <span className="rm-stat-label">Amount collected</span>
              <strong className="rm-stat-value rm-green">
                {money(collected)}
              </strong>
            </div>
            <div className="rm-card">
              <span className="rm-stat-label">Remaining balance</span>
              <strong className="rm-stat-value rm-red">
                {money(remaining)}
              </strong>
            </div>
          </div>

          <form className="rm-card rm-form" onSubmit={submitPayment}>
            <h3>Record a payment</h3>

            <div>
              <label className="rm-label" htmlFor="payment-amount">
                Amount received (₹)
              </label>
              <input
                id="payment-amount"
                className="rm-input"
                type="number"
                min="0.01"
                max={remaining}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Enter amount received"
                required
              />
              <small className="rm-hint">
                Outstanding: {money(remaining)}
              </small>
            </div>

            <div>
              <label className="rm-label" htmlFor="payment-date">
                Payment date
              </label>
              <input
                id="payment-date"
                className="rm-input"
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="rm-label" htmlFor="payment-notes">
                Notes (optional)
              </label>
              <input
                id="payment-notes"
                className="rm-input"
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Partial payment or advance payment"
                maxLength={250}
              />
            </div>

            <div className="rm-actions">
              <button
                className="rm-button"
                type="submit"
                disabled={loading || remaining <= 0}
              >
                {loading ? 'Saving...' : 'Record payment'}
              </button>
              <button
                className="rm-button rm-secondary"
                type="button"
                onClick={clearForm}
                disabled={loading}
              >
                Clear
              </button>
            </div>
          </form>

          <div className="rm-card rm-history">
            <div className="rm-history-header">
              <h3>Repayment history</h3>
              <span>{history.length} records</span>
            </div>

            {history.length === 0 ? (
              <div className="rm-empty">
                No repayment records found for this loan.
              </div>
            ) : (
              <div className="rm-table-wrap">
                <table className="rm-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={idOf(item)}>
                        <td>
                          {dateText(
                            item.paymentDate ||
                              item.dueDate ||
                              item.createdAt
                          )}
                        </td>
                        <td className="rm-amount">
                          {money(item.amount)}
                        </td>
                        <td>
                          <span
                            className={`rm-status rm-status-${String(
                              item.status || 'pending'
                            ).toLowerCase()}`}
                          >
                            {item.status || 'pending'}
                          </span>
                        </td>
                        <td>{item.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rm-card rm-empty">
          Create a loan first, or select an existing loan.
        </div>
      )}
    </section>
  );
}
