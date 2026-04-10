import { Router } from 'express';
import Joi from 'joi';
import { addIP, listIPs, updateIP, deleteIP } from '../controllers/ipController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router({ mergeParams: true });

router.use(authenticate);

const ipSchema = Joi.object({
  IpAddress: Joi.string().required(),
});

router.post('/', validate(ipSchema), addIP);
router.get('/', listIPs);
router.put('/:ipId', validate(ipSchema), updateIP);
router.delete('/:ipId', deleteIP);

export default router;
