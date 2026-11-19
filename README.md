# SkillForge – Career Readiness and Student Upskilling Platform

SkillForge is a full-stack web application developed to help students prepare for their future careers through structured career blueprints, skill gap analysis, and personalized learning roadmaps.

The platform allows students to explore career opportunities, identify the skills required for specific job roles, evaluate their existing skills, and follow structured learning paths to improve their career readiness.

The project aligns with **United Nations Sustainable Development Goal 4 (SDG 4): Quality Education**, which focuses on inclusive and equitable quality education and lifelong learning opportunities.

## Features

- **User Authentication:** Secure registration and login using JWT-based authentication and bcryptjs password hashing.
- **Career Blueprints:** Provides structured career paths with information about the skills required for different professional roles.
- **Skill Gap Analysis:** Helps students compare their existing skills with the requirements of their target career.
- **Learning Roadmaps:** Provides structured learning paths to help students develop career-specific skills.
- **Student Dashboard:** Allows users to access their profile, active roadmaps, and learning progress.
- **RESTful API:** Implements a modular backend architecture using Express.js.
- **Database Management:** Stores user information and career-related data using MongoDB and Mongoose.

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Backend | Node.js, Express.js |
| Database | MongoDB, MongoDB Atlas |
| ODM | Mongoose |
| Authentication | JWT, bcryptjs |
| Architecture | MVC, RESTful API |
| Deployment | Render |
| Version Control | Git, GitHub |

## Project Structure

```text
skillforge/
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   │   └── seed.js
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   └── js/
│   │
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── roadmap.html
│   └── skill-gap.html
│
└── README.md
```

## Installation and Setup

Follow these steps to run the project locally.

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd skillforge
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside the backend directory.

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

Replace the placeholder values with your actual MongoDB connection string and JWT secret.

Do not upload the `.env` file or expose sensitive credentials on GitHub.

Add the following entries to `.gitignore`:

```gitignore
node_modules/
.env
```

### 4. Start the Backend Server

```bash
npm start
```

Make sure the start script is configured in `backend/package.json`.

### 5. Initialize Career Data

If database initialization is required, run the seeder:

```bash
node utils/seed.js
```

Run this command from the backend directory.

### 6. Run the Frontend

Open the frontend `index.html` file using a local development server, such as the Live Server extension in Visual Studio Code.

Ensure that the frontend API configuration points to the correct backend server address.

## Authentication and Security

The application uses the following security mechanisms:

- **bcryptjs:** Hashes user passwords before storing them in the database.
- **JSON Web Tokens:** Handles user authentication.
- **Authentication Middleware:** Protects API routes from unauthorized access.
- **Environment Variables:** Stores sensitive configuration outside the source code.

## Project Objectives

1. Provide students with information about different career opportunities.
2. Help identify gaps between existing skills and career requirements.
3. Provide structured learning roadmaps for career development.
4. Encourage continuous learning and skill improvement.
5. Connect academic learning with industry-relevant skills.

## Future Scope

- AI-based career recommendations.
- Integration with external learning platforms.
- Advanced learning progress analytics.
- Career-specific assessments and quizzes.
- Administrative dashboard for managing career blueprints.
- Personalized learning recommendations.

## Author

**Saquib Monaf**

B.Tech – Computer Science and Engineering

**Project:** SkillForge – Career Readiness and Student Upskilling Platform

## License

This project was developed for educational and academic purposes.
