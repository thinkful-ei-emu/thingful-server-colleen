const knex = require("knex");
const app = require("../src/app");
const helpers = require("./test-helpers");
const bcrypt = require('bcryptjs')

describe("Users Endpoints", function() {
  let db;
  const { testUsers } = helpers.makeThingsFixtures();
  const testUser = testUsers[0]
  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL
    })
    app.set('db', db)
  });
  after("disconnect from db", () => db.destroy());
  before("cleanup", () => helpers.cleanTables(db));
  afterEach("cleanup", () => helpers.cleanTables(db));

  describe("POST /api/users", () => {
    context("User Validation", () => {
      beforeEach("insert users", () => helpers.seedUsers(db, testUsers));

      const requiredFields = ["user_name", "password", "full_name"];
      requiredFields.forEach(field => {
        const registerAttemptBody = {
          user_name: "test user_name",
          password: "test password",
          full_name: "test full_name",
          nickname: "test nickname"
        };
        it("responds with 400 required error when required field missing", () => {
          delete registerAttemptBody[field];
          return supertest(app)
            .post("/api/users")
            .send(registerAttemptBody)
            .expect(400, { error: `Missing '${field}' in request body` 
          });
        });
      });
      it("responds with 400 and password error if too short", () => {
        const userShortPassword = {
          user_name: "test user_name",
          password: "123456",
          full_name: "test full_name",
          nickname: "test nickname"
        };
        return supertest(app)
          .post("/api/users")
          .send(userShortPassword)
          .expect(400, { error: `Password must be longer than 8 characters` 
        });
      });
      it("responds with 400 and password error if too long", () => {
        const userLongPassword = {
          user_name: "test user_name",
          password: "*".repeat(73),
          full_name: "test full_name",
          nickname: "test nickname"
        };
        return supertest(app)
          .post("/api/users")
          .send(userLongPassword)
          .expect(400, { error: `Password must be less than 72 characters` });
      });
      it('responds with 400 and error when password starts with spaces',()=>{
        const userPwStartsWithSpace = {
          user_name: "test user_name",
          password: " !Ad34bsa",
          full_name: "test full_name",
          nickname: "test nickname"
        };
        return supertest(app)
        .post('/api/users')
        .send(userPwStartsWithSpace)
        .expect(400, {error: 'Password must not start or end with empty spaces'})
      })
      it('responds with 400 and error when password ends with spaces',()=>{
        const userPwEndsWithSpace = {
          user_name: "test user_name",
          password: "!Ad34bsa ",
          full_name: "test full_name",
          nickname: "test nickname"
        };
        return supertest(app)
        .post('/api/users')
        .send(userPwEndsWithSpace)
        .expect(400, {error: 'Password must not start or end with empty spaces'})
      })
      it('responds with 400 and error when password is not complex enough',()=>{
        const userSimplePw = {
          user_name: "test user_name",
          password: "AaBbCcDd",
          full_name: "test full_name",
          nickname: "test nickname"
        };
        return supertest(app)
        .post('/api/users')
        .send(userSimplePw)
        .expect(400, {error: 'Password must contain 1 upper case, lower case, number and special character'})
      })
      it('responds with 400 and error if user name already exists', ()=>{
        const userAlreadyExists ={
          user_name: testUser.user_name,
          password: "!Ad34bsa",
          full_name: "test full_name",
          nickname: "test nickname"
        }
        return supertest(app)
        .post('/api/users')
        .send(userAlreadyExists)
        .expect(400, {error: 'User name already exists'})
      })
    });
    context('Happy path',()=>{
      it('responds 201, serialized user, storing bcrypted password', ()=>{
        const newUser = {
          user_name: 'test user_name',
          password: '11AAaa!!',
          full_name: 'test full_name'
        }
        return supertest(app)
        .post('/api/users')
        .send(newUser)
        .expect(201)
        .expect(res=>{
          expect(res.body).to.have.property('id')
          expect(res.body.user_name).to.eql(newUser.user_name)
          expect(res.body.full_name).to.eql(newUser.full_name)
          expect(res.body.nickname).to.eql('')
          expect(res.body).to.not.have.property('password')
          expect(res.headers.location).to.eql(`/api/users/${res.body.id}`)
        })
        .expect(res=>
          db
          .from('thingful_users')
          .select("*")
          .where({id: res.body.id})
          .first()
          .then(row=>{
            expect(row.user_name).to.eql(newUser.user_name)
            expect(row.full_name).to.eql(newUser.full_name)
            expect(row.nickname).to.eql(null)

            return bcrypt.compare(newUser.password, row.password)
          })
          .then(compareMatch =>{
            expect(compareMatch).to.be.true
          })
          )
      })
    })
  });
});
