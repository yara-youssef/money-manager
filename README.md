# Money Manager

A spending dashboard for Excel exports from a money-tracking app. Upload an `.xlsx` file and get charts and insights about your spending habits, filtered by category, account, date range or a search on notes.

Everything runs in the browser: the file is never uploaded anywhere. The last file you loaded is kept in the browser's local storage so the dashboard is still there after a reload (use **Clear** to remove it).

## Expected file format

One sheet with a header row like:

| Period | Accounts | Category | Subcategory | Note | EUR | Income/Expense | Description | Amount | Currency | Accounts |
|---|---|---|---|---|---|---|---|---|---|---|

- **Period**: date and time of the transaction
- **EUR** (the column before *Income/Expense*): the amount in your base currency, used for all totals
- **Income/Expense**: `Exp.` or `Income`. Transfers are ignored.

## What the dashboard shows

- Totals for spending, investments, income, net savings with the savings rate, monthly average and typical purchase, compared with the previous period of the same length
- Income vs spending over time (per day, week or month depending on the range)
- Spending by category (click a bar to show only that category) and the category mix over time
- Top places (from the Note column), spending by day of week and by account
- Highlights written from your data, and recurring payments it detects
- A sortable transactions table

Categories with names like *investment* or *savings* are counted as savings by default rather than spending. Turn off **Count investments as savings** to count them as spending.

## Development

```sh
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
```
