import express from 'express'

import { login, signup, logout, googleLogin } from './auth.controller.js'

const router = express.Router()

router.post('/login', login)
router.post('/signup', signup)
router.post('/logout', logout)
router.post('/google', googleLogin)

export const authRoutes = router