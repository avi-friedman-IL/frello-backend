import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import {
  getBoards,
  getBoardById,
  addBoard,
  updateBoard,
  removeBoard,
  addBoardMsg,
  removeBoardMsg,
} from './board.controller.js'

const router = express.Router()

router.get('/', log,requireAuth, getBoards)
router.get('/:id', log, getBoardById)
router.post('/', log, requireAuth, addBoard)
router.put('/:id', requireAuth, updateBoard)
router.delete('/:id', requireAuth, removeBoard)

router.post('/:id/msg', requireAuth, addBoardMsg)
router.delete('/:id/msg/:msgId', requireAuth, removeBoardMsg)

export const boardRoutes = router
