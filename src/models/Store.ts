import { types } from 'mobx-state-tree'
import { AuthMenu, Sidebar } from "./Sidebar";
import { Modal } from './Modal'

export const Store = types
  .model('Store', {
    sidebar: Sidebar,
    modal: Modal,
    authmenu: AuthMenu
  })
  .actions(self => ({}))


export const store = Store.create({
  sidebar: {},
  modal: {},
  authmenu: {}
})

// The application breaks if you remove this??!?!?
;(window as any).store = store;
// TODO: this prolly needs to be removed
