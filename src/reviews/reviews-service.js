const xss = require('xss')

const ReviewsService = {
  getById(db, id) {
    return db
      .from('thingful_reviews AS rev')
      .select(
        'rev.id',
        'rev.rating',
        'rev.text',
        'rev.date_created',
        'rev.thing_id',
        db.raw(
          `row_to_json(
            (SELECT tmp FROM (
              SELECT
                usr.id,
                usr.user_name,
                usr.full_name,
                usr.nickname,
                usr.date_created,
                usr.date_modified
            ) tmp)
          ) AS "user"`
        )
      )
      .leftJoin(
        'thingful_users AS usr',
        'rev.user_id',
        'usr.id',
      )
      .where('rev.id', id)
      .first()
  },

  insertReview(db, newReview) {
    return db
      .insert(newReview)
      .into('thingful_reviews')
      .returning('*')
      .then(([review]) => review)
      .then(review =>
        ReviewsService.getById(db, review.id)
      )
  },

  serializeReview(review) {
    const { user } = review
    console.log('line 49', user)
    return {
      id: review.id,
      rating: review.rating,
      text: xss(review.text),
      thing_id: review.thing_id,
      date_created: review.date_created,
      user: {
        id: user.id,
        full_name: user.full_name,
        user_name: user.user_name,
        date_created: new Date(user.date_created)
      } || {},
    }
  }
}

module.exports = ReviewsService
