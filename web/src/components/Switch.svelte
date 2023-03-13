<script lang="ts">
  import { start } from '../adapters/switch';

  let check = false;

  const toggle = start((b) => {
    check = b;
  });
</script>

<h3>Using on off machine for switch component</h3>

<label>
  <input type="checkbox" value={check} on:click={toggle} />
  {check}
</label>
