<script>
  import { onMount } from 'svelte';

  let username = 'World';
  let isLoaded = false;

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    username = params.get('username') || 'World';
    isLoaded = true;
  });
</script>

{#if isLoaded}
  <h1 class="text-3xl font-bold flex justify-center items-center h-screen text-white">
    Hello, {username}!
  </h1>
{/if}


<style lang="postcss">
  :global(html) {
    background-color: #1a202c; 
  }
  
  :global(body) {
    margin: 0; 
    background-color: #1a202c; 
    color: #f7fafc; 
  }
</style>
