import ProductCodingView from './views/product-coding-view.vue'
import MaterialCodingView from './views/material-coding-view.vue'

export const routes = [
  { path: '/', redirect: '/product-coding' },
  { path: '/product-coding', name: 'ProductCoding', component: ProductCodingView },
  { path: '/material-coding', name: 'MaterialCoding', component: MaterialCodingView },
]
