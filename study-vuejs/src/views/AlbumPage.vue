<template>
  <albumHeader></albumHeader>

  <main>

    <div class="album py-5 bg-light">
      <div class="container">
        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3">
          <albumCard v-for="card in cards" :key="card" :initCard="card" @editContent="modiifyContent"></albumCard>  
        </div>
      </div>
    </div>
  </main>

  <album-footer></album-footer>
</template>

<script>
import albumHeader from '@/components/album/AlbumHeader.vue';
import albumCard from '@/components/album/AlbumCard.vue';
import albumFooter from '../components/album/AlbumFooter.vue';
import data from '@/data'

export default {
    data() {
        return {
            cards: data

        }
    },
  components: { albumHeader, albumCard, albumFooter },
  methods:{
      modiifyContent(content) {
          console.log(content)
      }
  }
};
</script>

<style>
</style>