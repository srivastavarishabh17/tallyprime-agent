# Satyakiran Agent Service (satyakiran-agent)

This repository contains the Agent Service / Portal for Satyakiran. It provides tools and interfaces for field agents to manage their tasks and client interactions.

## Prerequisites

- PHP >= 8.1
- Composer
- MySQL / PostgreSQL

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd satyakiran-agent
   ```

2. **Install dependencies:**
   ```bash
   composer install
   npm install
   ```

3. **Environment Setup:**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
   *Make sure to configure your database settings in the `.env` file.*

4. **Run Migrations & Seeders:**
   ```bash
   php artisan migrate --seed
   ```

5. **Start the application:**
   ```bash
   php artisan serve
   ```
