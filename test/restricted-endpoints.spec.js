const knex = require("knex");
const app = require("../src/app");
const helpers = require("./test-helpers");

describe('Protected endpoints',()=>{
  let db

  const {
    testUsers,
    
  } = helpers.makeThingsFixtures()

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => helpers.cleanTables(db))

  afterEach('cleanup', () => helpers.cleanTables(db))
      
  beforeEach('insert users', () =>
    db.into('thingful_users').insert(testUsers)
  )
    it('responds with 401 missing basic token when no basic token', ()=>{
      return supertest(app)
      .get('/api/things/1')
      .expect(401, {error: 'Missing basic token'})
    })
    it('responds 401 "Unauthorized request" when no credentials in token', ()=>{
      const userNoCreds = {user_name: '', password: ''}
      return supertest(app)
      .get('/api/things/1')
      .set('Authorization', helpers.makeAuthHeader(userNoCreds))
      .expect(401, {error: 'Unauthorized request'})
    })
    it('responds 401 "Unauthorized request" when invalid user', ()=>{
      const userInvalid = {user_name: 'no-existy', password: 'notauser'}
      return supertest(app)
      .get('/api/things/1')
      .set('Authorization', helpers.makeAuthHeader(userInvalid))
      .expect(401, {error: 'Unauthorized request'})
    })
    it('responds 401 "Unauthorized request" when invalid password given', ()=>{
      const userInvalid = { user_name: testUsers[0].user_name, password:'wrong'}
      return supertest(app)
      .get('/api/things/1')
      .set('Authorization', helpers.makeAuthHeader(userInvalid))
      .expect(401, {error: 'Unauthorized request'})
    })
  })
