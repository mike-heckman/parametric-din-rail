document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('config-form');
  const submitBtn = document.getElementById('generate-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const loader = submitBtn.querySelector('.loader');

  const downloadStlBtn = document.getElementById('download-stl-btn');
  const stlBtnText = downloadStlBtn.querySelector('.btn-text');
  const stlLoader = downloadStlBtn.querySelector('.loader');

  // Update slider visual readouts
  const updateRangeReadout = (inputId, valId, suffix = '') => {
    const input = document.getElementById(inputId);
    const val = document.getElementById(valId);
    if (input && val) {
      input.addEventListener('input', () => {
        val.textContent = `${input.value}${suffix}`;
      });
    }
  };

  updateRangeReadout('spacing', 'spacing-val', ' mm');
  updateRangeReadout('headDistance', 'headDistance-val', ' mm');
  updateRangeReadout('footDistance', 'footDistance-val', ' mm');

  const getPayload = (form, format) => {
    const formData = new FormData(form);
    return {
      format,
      numRails: Number(formData.get('numRails')),
      spacing: Number(formData.get('spacing')),
      headDistance: Number(formData.get('headDistance')),
      footDistance: Number(formData.get('footDistance')),
      footPadHeight: Number(formData.get('footPadHeight')),
      freestandingFoot: formData.get('freestandingFoot') === 'on',
      frontFootRail: formData.get('frontFootRail') === 'on',
      backFootRail: formData.get('backFootRail') === 'on'
    };
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Set loading state
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    loader.classList.remove('hidden');

    const payload = getPayload(form, 'glb');

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
        console.warn('API returned non-200');
      } else {
        console.log('API call successful');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const viewer = document.getElementById('onshape-viewer');
        viewer.src = url;
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

  downloadStlBtn.addEventListener('click', async () => {
    // Set loading state
    downloadStlBtn.disabled = true;
    stlBtnText.classList.add('hidden');
    stlLoader.classList.remove('hidden');

    const payload = getPayload(form, 'stl');
    console.log('Sending STL payload:', payload);

    try {
      const response = await fetch('/api/onshape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn('API returned non-200');
      } else {
        console.log('STL generation successful');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'model.stl';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading STL:', error);
    } finally {
      // Reset loading state
      downloadStlBtn.disabled = false;
      stlBtnText.classList.remove('hidden');
      stlLoader.classList.add('hidden');
    }
  });
});
