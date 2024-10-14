import { logger } from '../../services/logger.service.js'
import { socketService } from '../../services/socket.service.js'
import { boardService } from './board.service.js'

export async function getBoards(req, res) {
   const { loggedinUser } = req
   console.log('loggedinUser:', loggedinUser)
   const filterBy = req.query
   console.log('filterBy:', filterBy)
   try {
      const boards = await boardService.query(filterBy)
      res.json(boards)
   } catch (err) {
      logger.error('Failed to get boards', err)
      res.status(400).send({ err: 'Failed to get boards' })
   }
}

export async function getBoardById(req, res) {
   const filterBy = {
      txt: req.query.txt || '',
      noMembers: req.query.noMembers || false,
      noDueDate: req.query.noDueDate || false,
      noLabels: req.query.noLabels || false,
      selectMembers: req.query.selectMember || [],
      selectLabels: req.query.selectLabel || [],
   }
   try {
      const boardId = req.params.id
      const board = await boardService.getById(boardId, filterBy)
      res.json(board)
   } catch (err) {
      logger.error('Failed to get board', err)
      res.status(400).send({ err: 'Failed to get board' })
   }
}

export async function addBoard(req, res) {
   const { body: board, loggedinUser } = req
   console.log('loggedinUser:', loggedinUser)
   try {
      // board.owner = loggedinUser
      const addedBoard = await boardService.add(board)
      res.json(addedBoard)
   } catch (err) {
      logger.error('Failed to add board', err)
      res.status(400).send({ err: 'Failed to add board' })
   }
}

export async function updateBoard(req, res) {
   const board = req.body
   const userId = req.user ? req.user._id : 'defaultUserId'
   try {
      const updatedBoard = await boardService.update(board)
      socketService.broadcast({
         type: 'groupsUpdated',
         data: updatedBoard.groups,
         userId: userId,
         room: board._id,
      })
      socketService.broadcast({
         type: 'activitiesUpdated',
         data: updatedBoard.activities,
         userId: userId,
         room: board._id,
      })
      res.json(updatedBoard)
   } catch (err) {
      logger.error('Failed to update board', err)
      res.status(400).send({ err: 'Failed to update board' })
   }
}

export async function removeBoard(req, res) {
   try {
      const boardId = req.params.id
      const removedId = await boardService.remove(boardId)

      res.send(removedId)
   } catch (err) {
      logger.error('Failed to remove board', err)
      res.status(400).send({ err: 'Failed to remove board' })
   }
}

export async function addBoardMsg(req, res) {
   const { loggedinUser } = req

   try {
      const boardId = req.params.id
      const msg = {
         txt: req.body.txt,
         by: loggedinUser,
      }
      const savedMsg = await boardService.addBoardMsg(boardId, msg)
      res.json(savedMsg)
   } catch (err) {
      logger.error('Failed to update board', err)
      res.status(400).send({ err: 'Failed to update board' })
   }
}

export async function removeBoardMsg(req, res) {
   try {
      const boardId = req.params.id
      const { msgId } = req.params

      const removedId = await boardService.removeBoardMsg(boardId, msgId)
      res.send(removedId)
   } catch (err) {
      logger.error('Failed to remove board msg', err)
      res.status(400).send({ err: 'Failed to remove board msg' })
   }
}
