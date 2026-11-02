<template>
  <nav class="pl-4 pr-2 py-3 border-b border-gray-700 bg-gray-800 shadow-xl mb-8">
    <div class="container mx-auto flex items-stretch flex-wrap">
      <div class="flex-full md:flex-initial flex items-center">
        <img class="w-10 mr-5" src="/img/icon.svg" alt="" aria-hidden="true">

        <router-link to="/dashboard">
          <h1 class="font-semibold text-white">Athena Dashboard</h1>
        </router-link>
      </div>

      <div class="flex-1 flex items-center flex-wrap">
        <ul class="dashboard-nav list-none flex md:ml-8">
          <router-link class="flex-auto mr-4" to="/dashboard">Guilds</router-link>
          <a href="javascript:void(0)" class="navbar-item hover:text-red-400 mr-2" v-on:click="logout()">Log out</a>
        </ul>

        <div class="flex-1 flex items-center md:justify-end">
          <router-link to="/docs" role="menuitem"
            class="py-1 px-3 rounded hover:bg-gray-700 hidden lg:block transition-colors font-semibold hover:text-white">
            Documentation
          </router-link>
        </div>
      </div>
    </div>
  </nav>

  <div class="dashboard container mx-auto px-2 py-2 md:px-6 md:py-6">
    <Title title="Athena - Dashboard" />

    <div class="main-content">
      <router-view></router-view>
    </div>
  </div>
</template>

<style scoped>
.dashboard-nav a {
  &:hover {
    text-decoration: var(--text-underline);
  }
}

.dashboard-nav .router-link-exact-active {
  text-decoration: var(--text-underline);
}
</style>

<script>
import Title from "../Title.vue";

export default {
  components: {
    Title,
  },
  methods: {
    async logout() {
      await this.$store.dispatch("auth/logout");
      window.location.pathname = '/';
    }
  },
};
</script>
