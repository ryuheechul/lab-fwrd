<script lang="ts">
  import { start } from '../adapters/traffic-lights';

  let light = '';

  start((_light) => {
    light = _light;
  });
</script>

<h4>Using traffic-ligh machine to observe the status</h4>

{light}
