<template>
  <div class="palette">
    <section class="section edit" aria-label="Edit">
      <header class="section__title">Edit</header>
      <div class="section__controls">
        <Button @click="resetLayout">Reset</Button>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'Palette',
  methods: {
    resetLayout() {
      this.$emit('reset-layout');
    },
  },
};
</script>
