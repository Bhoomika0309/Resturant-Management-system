document.getElementById('orderForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent default form submission

    const selectedDishes = Array.from(document.querySelectorAll('#orderForm input[name="dishes"]:checked'));
    const orderItems = selectedDishes.map(item => {
        const [name, price] = item.value.split('_');
        return { dishName: name, price: parseFloat(price) };
    });

    // Send orderItems to the server
    // Example: POST request using Fetch API
    fetch('/submit-order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: orderItems }),
    })
        .then(response => response.text())
        .then(data => {
            console.log(data); // Handle response
        })
        .catch(error => {
            console.error('Error:', error);
        });
});