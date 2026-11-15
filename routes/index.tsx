import { Router } from "express";
import User from './user.jsx'
import Task from './task.jsx';
import Chat from './chat.jsx'

const route = Router();

route.use('/user', User);
route.use('/task', Task);
route.use('/chat', Chat);

export default route;