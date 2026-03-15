const FAQS = [
  {
    question: 'How do I turn off my meal for a day?',
    answer:
      "Go to Home, click on the date in the calendar, then toggle off the meals you don't want.",
  },
  {
    question: 'How do I view my payment slip?',
    answer:
      'Go to Payment Details, select the month, and your slip will appear. Use the Download button to save it.',
  },
  {
    question: 'What does the pink color on the calendar mean?',
    answer:
      'Pink dates mean the hall is officially closed. No meals are counted for these dates.',
  },
  {
    question: 'What are dues?',
    answer:
      'Dues are unpaid bills from previous months. They are added to your current month total.',
  },
  {
    question: 'How do I change my password?',
    answer: 'Use the Change Password option in the sidebar.',
  },
  {
    question: 'I forgot my password. What do I do?',
    answer: 'Contact the hall office. They can reset your password.',
  },
]

export default function HelpPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-slate-900">Help & FAQ</h1>
        <p className="mt-1 text-sm text-slate-600">Common questions about meals, bills, and account access.</p>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq) => (
          <details key={faq.question} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
            <summary className="cursor-pointer list-none text-base font-semibold text-slate-900">
              {faq.question}
            </summary>
            <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}