import { ObjectId } from 'mongodb'

import { asyncLocalStorage } from '../../services/als.service.js'
import { logger } from '../../services/logger.service.js'
import { dbService } from '../../services/db.service.js'

export const reviewService = { query, remove, add }

async function query(filterBy = {}) {
	try {
		const criteria = _buildCriteria(filterBy)
		const collection = await dbService.getCollection('review')
        
		var reviews = await collection.aggregate([
            {
                $match: criteria,
            },
            {
                $lookup: {
                    localField: 'byUserId',
                    from: 'user',
                    foreignField: '_id',
                    as: 'byUser',
                },
            },
            {
                $unwind: '$byUser',
            },
            {
                $lookup: {
                    localField: 'aboutUserId',
                    from: 'user',
                    foreignField: '_id',
                    as: 'aboutUser',
                },
            },
            {
                $unwind: '$aboutUser',
            },
        ]).toArray()

		reviews = reviews.map(review => {
			review.byUser = { 
                _id: review.byUser._id, 
                fullname: review.byUser.fullname 
            }
			review.aboutUser = { 
                _id: review.aboutUser._id, 
                fullname: review.aboutUser.fullname 
            }
			delete review.byUserId
			delete review.aboutUserId
			return review
		})

		return reviews
	} catch (err) {
		logger.error('cannot get reviews', err)
		throw err
	}
}

async function remove(reviewId) {
	try {
		const { loggedinUser } = asyncLocalStorage.getStore()
		const collection = await dbService.getCollection('review')

		const criteria = { _id: ObjectId.createFromHexString(reviewId) }

        // remove only if user is owner/admin
		if (!loggedinUser.isAdmin) {
            criteria.byUserId = ObjectId.createFromHexString(loggedinUser._id)
        }

        const { deletedCount } = await collection.deleteOne(criteria)
		return deletedCount
	} catch (err) {
		logger.error(`cannot remove review ${reviewId}`, err)
		throw err
	}
}

async function add(review) {
    try {
        const reviewToAdd = {
            byUserId: ObjectId.createFromHexString(review.byUserId),
			aboutUserId: ObjectId.createFromHexString(review.aboutUserId),
			txt: review.txt,
		}
		const collection = await dbService.getCollection('review')
		await collection.insertOne(reviewToAdd)
        
		return reviewToAdd
	} catch (err) {
		logger.error('cannot add review', err)
		throw err
	}
}

function _buildCriteria(filterBy) {
	const criteria = {}

	if (filterBy.byUserId) {
        criteria.byUserId = ObjectId.createFromHexString(filterBy.byUserId)
    }
	return criteria
}