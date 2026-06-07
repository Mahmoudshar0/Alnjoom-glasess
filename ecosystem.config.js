module.exports = {
  "apps": [
    {
      "name": "optivision-backend",
      "cwd": "./backend",
      "script": "dist/index.js",
      "interpreter": "node",
      "watch": false,
      "env": {
        "NODE_ENV": "production",
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/optivision",
        "JWT_SECRET": "optivision-secret-3375-16525",
        "PORT": "3001"
      }
    },
    {
      "name": "optivision-frontend",
      "cwd": "./frontend",
      "script": "node_modules/vite/bin/vite.js",
      "interpreter": "node",
      "watch": false,
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}