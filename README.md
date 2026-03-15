# Hall Management Web App

## Tech Stack

- React.js with Vite
- JavaScript (ES modules)
- Tailwind CSS v3
- React Router DOM v6
- Zustand
- Supabase (PostgreSQL and Auth)
- jsPDF and jspdf-autotable
- @react-pdf-viewer/core
- date-fns
- lucide-react
- react-hot-toast
- react-hook-form and zod
- SheetJS (xlsx)

## Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project

## Setup Instructions

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Copy the environment template:

```bash
copy .env.example .env
```

4. Set the environment variables in `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase Setup

1. Open your Supabase project.
2. Go to SQL Editor.
3. Run the SQL from [supabase/schema.sql](supabase/schema.sql).
4. Create at least one hall.
5. Create Supabase Auth users for provost/staff and matching rows in `profiles`.
6. Add student records to the `students` table.

## Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Running the App

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

## Project Structure

```text
src/
	components/
		calendar/
		payment/
		shared/
	constants/
	hooks/
	lib/
	pages/
		provost/
		public/
		staff/
		student/
	store/
	utils/
supabase/
	schema.sql
```

## Role Credentials

Credentials are project-specific and must be seeded in your Supabase instance.

- Provost and Staff use Supabase Auth email/password credentials plus `profiles` rows.
- Students use `student_id` and the password stored in `students.password_hash`.

## Known Limitations

- Student authentication is still frontend-driven and should be moved to a secure backend or edge function for production.
- The integrated PDF viewer depends on `pdfjs-dist`, which triggers a build warning from upstream packaging.
- Large PDF and spreadsheet libraries are lazy-loaded, but their feature-specific chunks are still sizable.
- Hall office phone/email are currently hard-coded display values unless you extend the `halls` schema.
