import { Router } from 'express';
import Joi from 'joi';
import {
  createSubnet,
  listSubnets,
  updateSubnet,
  deleteSubnet,
  getSubnetInfo,
} from '../controllers/subnetController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

const createSchema = Joi.object({
  SubnetName: Joi.string().min(1).max(100).required(),
  SubnetAddress: Joi.string().required(),
});

const updateSchema = Joi.object({
  SubnetName: Joi.string().min(1).max(100),
  SubnetAddress: Joi.string(),
}).min(1);

router.post('/', validate(createSchema), createSubnet);
router.get('/', listSubnets);
router.get('/:id', getSubnetInfo);
router.put('/:id', validate(updateSchema), updateSubnet);
router.delete('/:id', deleteSubnet);

export default router;
