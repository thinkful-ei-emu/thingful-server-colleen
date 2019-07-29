const knex = require('knex')
const app = require('../src/app')
const helpers = require('./test-helpers')

describe('Things Endpoints', function() {
  let db

  const {
    testUsers,
    testThings,
    testReviews,
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

  describe(`GET /api/things`, () => {
    context(`Given no things`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/things')
          .expect(200, [])
      })
    })

    context('Given there are things in the database', () => {
      beforeEach('insert things', () =>
        helpers.seedThingsTables(
          db,
          testUsers,
          testThings,
          testReviews,
        )
      )

      it('responds with 200 and all of the things', () => {
        const expectedThings = testThings.map(thing =>
          helpers.makeExpectedThing(
            testUsers,
            thing,
            testReviews,
          )
        )
        return supertest(app)
          .get('/api/things')
          .expect(200, expectedThings)
      })
    })

    context(`Given an XSS attack thing`, () => {
      const testUser = helpers.makeUsersArray()[1]
      const {
        maliciousThing,
        expectedThing,
      } = helpers.makeMaliciousThing(testUser)

      beforeEach('insert malicious thing', () => {
        return helpers.seedMaliciousThing(
          db,
          testUser,
          maliciousThing,
        )
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/things`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedThing.title)
            expect(res.body[0].content).to.eql(expectedThing.content)
          })
      })
    })
  })

 

  describe(`GET /api/things/:thing_id`, () => {
   
    function makeAuthHeader(user){
      const token = Buffer.from(`${user.user_name}:${user.password}`).toString('base64')
      return `Basic ${token}`
    }

    describe('Protected endpoints',()=>{
      
      describe('GET api/things/:thing_id', ()=>{
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
          .set('Authorization', makeAuthHeader(userNoCreds))
          .expect(401, {error: 'Unauthorized request'})
        })
        it('responds 401 "Unauthorized request" when invalid user', ()=>{
          const userInvalid = {user_name: 'no-existy', password: 'notauser'}
          return supertest(app)
          .get('/api/things/1')
          .set('Authorization', makeAuthHeader(userInvalid))
          .expect(401, {error: 'Unauthorized request'})
        })
        it('responds 401 "Unauthorized request" when invalid password given', ()=>{
          const userInvalid = { user_name: testUsers[0].user_name, password:'wrong'}
          return supertest(app)
          .get('/api/things/1')
          .set('Authorization', makeAuthHeader(userInvalid))
          .expect(401, {error: 'Unauthorized request'})
        })
      })
    })
  
    context(`Given no things`, () => {
      beforeEach('insert users', () =>
        db.into('thingful_users').insert(testUsers)
      )
      it(`responds with 404`, () => {
        
        const thingId = 123456
        return supertest(app)
          .get(`/api/things/${thingId}`)
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .expect(404, { error: `Thing doesn't exist` })
      })
    })
  

    context('Given there are things in the database', () => {
      beforeEach('insert things', () =>
        helpers.seedThingsTables(
          db,
          testUsers,
          testThings,
          testReviews,
        )
      )

      it('responds with 200 and the specified thing', () => {
        const thingId = 2
        const expectedThing = helpers.makeExpectedThing(
          testUsers,
          testThings[thingId - 1],
          testReviews,
        )

        return supertest(app)
          .get(`/api/things/${thingId}`)
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .expect(200, expectedThing)
      })
    })

    context(`Given an XSS attack thing`, () => {
      const testUser = helpers.makeUsersArray()[1]
      const {
        maliciousThing,
        expectedThing,
      } = helpers.makeMaliciousThing(testUser)

      beforeEach('insert malicious thing', () => {
        return helpers.seedMaliciousThing(
          db,
          testUser,
          maliciousThing,
        )
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/things/${maliciousThing.id}`)
          .set('Authorization', makeAuthHeader(testUser))
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedThing.title)
            expect(res.body.content).to.eql(expectedThing.content)
          })
      })
    })
  })
  describe(`GET /api/things/:thing_id/reviews`, () => {
    function makeAuthHeader(user){
      const token = Buffer.from(`${user.user_name}:${user.password}`).toString('base64')
      return `Basic ${token}`
    }
    context(`Given no things`, () => {
     
      it(`responds with 404`, () => {
        
        const thingId = 123456
        return supertest(app)
          .get(`/api/things/${thingId}/reviews`)
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .expect(404, { error: `Thing doesn't exist` })
      })
    })

    context('Given there are reviews for thing in the database', () => {
      beforeEach('insert things', () =>
        helpers.seedThingsTables(
          db,
          testUsers,
          testThings,
          testReviews,
        )
      )

      it('responds with 200 and the specified reviews', () => {
        const thingId = 1
        const expectedReviews = helpers.makeExpectedThingReviews(
          testUsers, thingId, testReviews
        )

        return supertest(app)
          .get(`/api/things/${thingId}/reviews`)
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .expect(200, expectedReviews)
      })
    })
  })
})
  

