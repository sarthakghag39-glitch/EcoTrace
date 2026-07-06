async function test() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test AI User', email: `ai${Date.now()}@test.com`, password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    await fetch('http://localhost:3000/api/footprint/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ carDistance: 50, electricityKwh: 30, dietType: 'vegan', wasteVolume: 'low' })
    });

    const aiRes = await fetch('http://localhost:3000/api/ai/coach', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const aiData = await aiRes.json();
    console.log('AI Response:', aiData);
  } catch (err) {
    console.error('Test Failed:', err);
  }
}

test();
