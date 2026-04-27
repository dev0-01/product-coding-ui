import ProductCodingView from './views/ProductCodingView.vue'
import MaterialCodingView from './views/MaterialCodingView.vue'

export const routes = [
  { path: '/', redirect: '/product-coding' },
  { path: '/product-coding', name: 'ProductCoding', component: ProductCodingView },
  { path: '/material-coding', name: 'MaterialCoding', component: MaterialCodingView },
]
