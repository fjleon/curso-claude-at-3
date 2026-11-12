import { Router } from 'express'
import { tableController } from '@routes/table.dependencies.js'
import { authenticate } from '@shared/infrastructure/http/middlewares.js'

const router = Router({ mergeParams: true })

router.get('/', authenticate, tableController.getAvailable)
router.post('/:id/occupy', authenticate, tableController.occupy)

export default router
