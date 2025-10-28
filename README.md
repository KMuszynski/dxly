# 🏥 DXLY - Medical Diagnosis Assistant

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.0.0-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.0-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.18-38B2AC?style=for-the-badge&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)

_A web-based application for medical doctors to assist with the diagnosis process_

</div>

---

## 📋 About

**DXLY** is an intelligent medical diagnosis assistant designed to help healthcare professionals streamline their diagnostic workflow. Built as the foundation for an engineering thesis, this application leverages cutting-edge technologies and medical datasets to provide accurate diagnostic support.

### 🎯 Purpose

- Assist medical doctors in the diagnosis process
- Provide intelligent recommendations based on symptoms and patient data
- Streamline clinical decision-making workflows
- Serve as a comprehensive platform for medical diagnosis assistance

---

## 🛠️ Tech Stack

### Frontend

- **Next.js 16** - React framework with App Router
- **React 19** - UI library with latest features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework

### Backend

- **Supabase** - Backend-as-a-Service with PostgreSQL
- **PostgreSQL** - Robust relational database

### External Resources

- **HPO (Human Phenotype Ontology)** - Comprehensive phenotype dataset
- **OpenAI ChatGPT API** - AI-powered diagnostic assistance

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd dxly
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase**

   - Create a new project at [supabase.com](https://supabase.com)
   - Apply SQL migration files from the `migrations/` directory in chronological order
   - Note down your project URL and anon key

4. **Configure environment variables**

   ```bash
   cp .env.template .env.local
   ```

   Edit `.env.local` with your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
dxly/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── lib/                   # Utility libraries
│   └── supabase.ts        # Supabase client configuration
├── public/                # Static assets
├── .env.template          # Environment variables template
├── .env.local.example     # Environment variables example
└── README.md             # This file
```

---

## 🔧 Available Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Build for production     |
| `npm run start` | Start production server  |
| `npm run lint`  | Run ESLint               |

---

## 🏗️ Development

### Database Setup

1. Create a Supabase project
2. Run migration files in the `migrations/` directory
3. Configure Row Level Security (RLS) policies as needed
4. Set up your environment variables

### Environment Variables

Required environment variables for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Human Phenotype Ontology](https://hpo.jax.org/)
- [OpenAI API Documentation](https://platform.openai.com/docs)

---

## 📄 License

This project is part of an engineering thesis and is intended for educational and research purposes.

---

<div align="center">

**Built with ❤️ for the medical community**

</div>
