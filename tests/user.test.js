  const request = require('supertest');
  const app = require('../server'); 
  const pool = require('../db'); 
  const bcrypt = require('bcrypt');

  describe('User APIs', () => {
      beforeAll(async () => {
          // Clear users table before each test
          await pool.query(`DELETE FROM users`);

          // Hash the test password properly before inserting
          const hashedPassword = await bcrypt.hash('password123', 10);

          // Insert test user with correct hashed password
          await pool.query(
              `INSERT INTO users (email, password_hash, name) VALUES ('test@example.com', $1, 'Test User')`,
              [hashedPassword]
          );
      });

      afterAll(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // ✅ Small delay before closing DB
        await pool.end().catch(err => console.error("Error closing pool:", err));
    });
    

      test('POST /api/users/register - Should create a new user', async () => {
          const response = await request(app).post('/api/users/register').send({
              email: 'newuser@example.com',
              password: 'password123',
              name: 'New User',
          });

          console.log("Register Response:", response.body);  // ✅ Debugging log

          expect(response.statusCode).toBe(201);
          expect(response.body).toHaveProperty('message', 'User registered successfully');
      });

      test('POST /api/users/login - Should log in a user', async () => {
          const response = await request(app).post('/api/users/login').send({
              email: 'test@example.com',
              password: 'password123',  
          });

          console.log("Login Response:", response.body);  // ✅ Debugging log

          expect(response.statusCode).toBe(200);
          expect(response.body).toHaveProperty('token');
      });

      test('GET /api/users/profile - Should fetch user profile', async () => {
          const loginResponse = await request(app).post('/api/users/login').send({
              email: 'test@example.com',
              password: 'password123',
          });

          console.log("Login Response:", loginResponse.body);  // ✅ Debugging log

          const token = loginResponse.body.token;
          if (!token) {
              throw new Error('Token not received from login');
          }

          const response = await request(app)
              .get('/api/users/profile') 
              .set('Authorization', `Bearer ${token}`);

          expect(response.statusCode).toBe(200);
          expect(response.body).toHaveProperty('email', 'test@example.com');
      });
  });
