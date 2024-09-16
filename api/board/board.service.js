import { MongoClient, ObjectId } from 'mongodb'
const mongoId = ObjectId.createFromHexString

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 3

export const boardService = {
    remove,
    query,
    getById,
    add,
    update,
    addBoardMsg,
    removeBoardMsg,

}

async function query(filterBy = { txt: '' }) {
    try {
        const criteria = _buildCriteria(filterBy)
        const sort = _buildSort(filterBy)

        const collection = await dbService.getCollection('board')
        var boardCursor = await collection.find(criteria, { sort })

        if (filterBy.pageIdx !== undefined) {
            boardCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
        }

        const boards = boardCursor.toArray()
        return boards
    } catch (err) {
        logger.error('cannot find boards', err)
        throw err
    }
}

async function getById(boardId, filterBy) {
    console.log('filterBy:', filterBy)
    try {
        const collection = await dbService.getCollection('board')

        const criteria = { _id: mongoId(boardId) }
        const board = await collection.findOne(criteria)

        if (filterBy.txt) {
            const regex = new RegExp(filterBy.txt, 'i')
            board.groups = board.groups.filter(
                group => group.title.match(regex)
                //  ||group.tasks.some(task => task.title.match(regex))
            )
        }
        if (filterBy.noMembers === 'true') {
            board.groups = board.groups.map(group => {
                group.tasks = group.tasks?.filter(
                    task => task.members.length === 0
                )
                return group
            })
        }
        if (filterBy.noDueDate === 'true') {
            board.groups = board.groups.map(group => {
                group.tasks = group.tasks?.filter(task => task.dueDate === '')
                return group
            })
        }
        if (filterBy.noLabels === 'true') {
            board.groups = board.groups.map(group => {
                group.tasks = group.tasks?.filter(
                    task => task.labels?.length === 0
                )
                return group
            })
        }
        if (filterBy.selectMembers.length > 0) {
            board.groups = board.groups.map(group => {
                group.tasks = group.tasks?.filter(task =>
                    task.members.some(member =>
                        filterBy.selectMembers.includes(member.id)
                    )
                )
                return group
            })
        }
        if (filterBy.selectLabels.length > 0) {
            board.groups = board.groups.map(group => {
                group.tasks = group.tasks?.filter(task =>
                    task.labels?.some(label =>
                        filterBy.selectLabels.includes(label.color)
                    )
                )
                return group
            })
        }


        return board
    } catch (err) {
        logger.error(`while finding board ${boardId}`, err)
        throw err
    }
}

async function remove(boardId) {
    const { loggedinUser } = asyncLocalStorage.getStore()
    const { _id: ownerId, isAdmin } = loggedinUser

    try {
        const criteria = {
            _id: mongoId(boardId),
        }
        if (!isAdmin) criteria['owner._id'] = ownerId

        const collection = await dbService.getCollection('board')
        const res = await collection.deleteOne(criteria)

        if (res.deletedCount === 0) throw 'Not your board'
        return boardId
    } catch (err) {
        logger.error(`cannot remove board ${boardId}`, err)
        throw err
    }
}

async function add(board) {
    try {
        const collection = await dbService.getCollection('board')
        await collection.insertOne(board)

        return board
    } catch (err) {
        logger.error('cannot insert board', err)
        throw err
    }
}

async function update(board) {
    const boardToSave = board

    try {
        const criteria = { _id: mongoId(board._id) }
        delete boardToSave._id
        const collection = await dbService.getCollection('board')
        await collection.updateOne(criteria, { $set: boardToSave })

        return board
    } catch (err) {
        logger.error(`cannot update board ${board._id}`, err)
        throw err
    }
}

async function addBoardMsg(boardId, msg) {
    try {
        const criteria = { _id: mongoId(boardId) }
        msg.id = makeId()

        const collection = await dbService.getCollection('board')
        await collection.updateOne(criteria, { $push: { msgs: msg } })

        return msg
    } catch (err) {
        logger.error(`cannot add board msg ${boardId}`, err)
        throw err
    }
}

async function removeBoardMsg(boardId, msgId) {
    try {
        const criteria = { _id: mongoId(boardId) }

        const collection = await dbService.getCollection('board')
        await collection.updateOne(criteria, { $pull: { msgs: { id: msgId } } })

        return msgId
    } catch (err) {
        logger.error(`cannot add board msg ${boardId}`, err)
        throw err
    }
}

function _buildCriteria(filterBy) {
    const criteria = {}
    if (filterBy.txt) {
        const txtCriteria = { $regex: filterBy.txt, $options: 'i' }
        criteria.$or = [{ title: txtCriteria }, { description: txtCriteria }]
    }

    return criteria
}

function _buildSort(filterBy) {
    if (!filterBy.sortField) return {}
    return { [filterBy.sortField]: filterBy.sortDir }
}

