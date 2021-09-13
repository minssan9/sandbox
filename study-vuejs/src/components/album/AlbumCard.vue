<template>
  <div class="col">
    <div class="card shadow-sm">
      <img :src="card.imageUrl" />

      <div class="card-body">
        <div class="card-text" v-if="isEditMode">
          <textarea v-model="card.content" style="width: 100%"></textarea>
        </div>
        <p class="card-text" v-else>
          {{ card.content }}
        </p>
        <div class="d-flex justify-content-between align-items-center">
          <div class="btn-group">
            <button type="button" class="btn btn-sm btn-outline-secondary">
              View
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="edit"
            >
              Edit
            </button>
          </div>
          <small class="text-muted">9 mins</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ["initCard"],
  data() {
    return {
      card: this.initCard,
      isEditMode: false,
    };
  },
  methods: {
    edit() {
      if (this.isEditMode) {
        this.isEditMode = false;
        this.$emit("editContent", this.card.content);
      } else {
        this.isEditMode = true;
      }
    },
  },
};
</script>

<style>
</style>