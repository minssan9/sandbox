import { createWebHistory, createRouter } from "vue-router";

const routes = [
  {
    path: "/hello-world",
    name: "helloWorld",
    component: () => import("@/views/HelloWorldPage"),
  },
  {
    path: "/album",
    name: "album",
    component: () => import("@/views/AlbumPage"),
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;