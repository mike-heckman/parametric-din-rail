document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('config-form');
  const submitBtn = document.getElementById('generate-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const loader = submitBtn.querySelector('.loader');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Set loading state
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    loader.classList.remove('hidden');

    const formData = new FormData(form);
    const payload = {
      numRails: Number(formData.get('numRails')),
      spacing: Number(formData.get('spacing')),
      headDistance: Number(formData.get('headDistance')),
      footDistance: Number(formData.get('footDistance')),
      footPadHeight: Number(formData.get('footPadHeight')),
      freestandingFoot: formData.get('freestandingFoot') === 'on',
      frontFootRail: formData.get('frontFootRail') === 'on',
      backFootRail: formData.get('backFootRail') === 'on'
    };

    console.log('Sending payload:', payload);

    try {
      // Send to /api/onshape
      const response = await fetch('/api/onshape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn('API returned non-200, which is expected before backend implementation.');
      } else {
        console.log('API call successful');
        const viewer = document.getElementById('onshape-viewer');
        const url = new URL(viewer.src);
        url.searchParams.set('t', Date.now());
        viewer.src = url.toString();
      }
    } catch (error) {
      console.error('Error sending request:', error);
    } finally {
      // Reset loading state
      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      loader.classList.add('hidden');
    }
  });
});
