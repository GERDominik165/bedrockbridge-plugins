import { system, world, ItemTypes } from "@minecraft/server"
import { bridge } from "../addons";
const list = ItemTypes.getAll().map(type => type.id)
