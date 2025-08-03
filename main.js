
// main.js
(function() {
    'use strict';
    
    // Configuration
    const API_ENDPOINT = '/api/extract';
    const SEPARATOR = '\n' + '*'.repeat(80) + '\n';
    
    // DOM Elements
    const urlInput = document.getElementById('urlInput');
    const fetchButton = document.getElementById('fetchButton');
    const outputContent = document.getElementById('outputContent');
    const errorMessage = document.getElementById('errorMessage');
    const charCount = document.getElementById('charCount');
    const copyButton = document.getElementById('copyButton');
    const clearButton = document.getElementById('clearButton');
    const toast = document.getElementById('toast');
    
    // State
    let isLoading = false;
    
    // Event Listeners
    fetchButton.addEventListener('click', handleFetch);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isLoading) {
            handleFetch();
        }
    });
    
    outputContent.addEventListener('input', updateCharCount);
    copyButton.addEventListener('click', handleCopy);
    clearButton.addEventListener('click', handleClear);
    
    // Initialize
    updateCharCount();
    
    // Functions
    async function handleFetch() {
        const url = urlInput.value.trim();
        
        if (!url) {
            showError('Non valide entered URL');
            return;
        }
        
        if (!isValidUrl(url)) {
            showError('URL is not valid');
            return;
        }
        
        setLoading(true);
        hideError();
        
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + btoa('mpaka:fdhjfdh2025')
                },
                body: JSON.stringify({ url })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.content) {
                appendContent(data.content);
                showToast('Fetch success! 🎉', 'success');
                urlInput.value = '';
            } else {
                throw new Error(data.error || 'Error during fetch');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showError(error.message || 'Error during fetch');
            showToast('Error during fetch 😕', 'error');
        } finally {
            setLoading(false);
        }
    }
    
    function appendContent(newContent) {
        const currentContent = outputContent.value.trim();
        
        if (currentContent) {
            outputContent.value = currentContent + SEPARATOR + newContent;
        } else {
            outputContent.value = newContent;
        }
        
        updateCharCount();
        
        // Scroll to the new content
        outputContent.scrollTop = outputContent.scrollHeight;
    }
    
    function handleCopy() {
        if (!outputContent.value.trim()) {
            showToast('No content to copy', 'error');
            return;
        }
        
        outputContent.select();
        
        try {
            document.execCommand('copy');
            showToast('Content Copied! 📋', 'success');
            
            // Deselect text on mobile
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
        } catch (err) {
            // Fallback for modern browsers
            navigator.clipboard.writeText(outputContent.value)
                .then(() => showToast('Content copied! 📋', 'success'))
                .catch(() => showToast('Error during copy', 'error'));
        }
    }
    
    function handleClear() {
        if (!outputContent.value.trim()) {
            return;
        }
        
        if (confirm('This will erase all content, Are you sure ?')) {
            outputContent.value = '';
            updateCharCount();
            showToast('Contenu effacé 🗑️', 'success');
        }
    }
    
    function updateCharCount() {
        const count = outputContent.value.length;
        charCount.textContent = `${count.toLocaleString()} caractères`;
    }
    
    function isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }
    
    function setLoading(loading) {
        isLoading = loading;
        fetchButton.disabled = loading;
        fetchButton.classList.toggle('loading', loading);
        urlInput.disabled = loading;
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
    }
    
    function hideError() {
        errorMessage.classList.remove('show');
    }
    
    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        
        // Force reflow
        void toast.offsetWidth;
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
  
})();
