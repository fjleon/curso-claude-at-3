import { Router } from 'express'
import { tableController } from '@routes/table.dependencies.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const STAFF = ['admin', 'manager', 'camarero', 'cocinero']

const router = Router({ mergeParams: true })

router.post('/', authenticate, authorize(['admin']), tableController.create)
router.get('/', authenticate, authorize(STAFF), tableController.getAll)
router.get('/:id', authenticate, authorize(STAFF), tableController.getById)
router.put('/:id', authenticate, authorize(['admin']), tableController.update)
router.delete('/:id', authenticate, authorize(['admin']), tableController.delete)
router.patch('/:id/status', authenticate, authorize(STAFF), tableController.changeStatus)

export default router
