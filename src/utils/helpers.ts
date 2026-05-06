export const appendFixedSlides = (slides: any[] = []) => {
  const safeSlides = Array.isArray(slides) ? slides : [];
  let newSlides = [...safeSlides];
  if (!newSlides.find(s => s.id === 'founder-note')) {
    newSlides.push({ 
      id: 'founder-note', 
      title: "Founder Note", 
      content: "Founder's internal notes...", 
      imageUrl: null, 
      showNarrative: true, 
      appendix: {}, 
      isFixed: true 
    });
  }
  if (!newSlides.find(s => s.id === 'vc-feedback')) {
    newSlides.push({ 
      id: 'vc-feedback', 
      title: "Angel/VC Feedback", 
      content: "VCs can leave feedback here...", 
      imageUrl: null, 
      showNarrative: true, 
      appendix: {}, 
      isFixed: true 
    });
  }
  return newSlides;
};

export const generateSecurePin = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789@#*&!';
  return Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};
