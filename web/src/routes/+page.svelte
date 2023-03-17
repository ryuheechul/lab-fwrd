<script lang="ts">
  import Switch from '../components/Switch.svelte';
  import TrafficLights from '../components/TrafficLights.svelte';

  let switch1 = true;
  let switch2 = false;
</script>

<h1>Welcome to SvelteKit</h1>
<Switch bind:isOn={switch1} />
{#if switch1}
  <TrafficLights />
{/if}
<Switch bind:isOn={switch2} />
{#if switch2}
  <TrafficLights />
{/if}
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
