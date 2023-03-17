<script lang="ts">
  import { start } from '../adapters/switch';

  export let isOn = false;

  const toggle = start((b) => {
    isOn = b;
  }, isOn);
</script>

<h3>Show traffic light - Using on off machine for switch component</h3>

<label>
  <input type="checkbox" checked={isOn} on:click={toggle} />
  {isOn}
</label>
