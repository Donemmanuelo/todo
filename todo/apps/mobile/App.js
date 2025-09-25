import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';

export default function App() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    // Fetch tasks from API
    fetch('http://localhost:3000/api/tasks')
      .then(res => res.json())
      .then(data => setTasks(data.tasks || []))
      .catch(err => console.log('API not available:', err));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart To-Do Mobile</Text>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.taskItem}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text style={styles.taskStatus}>Status: {item.status}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No tasks found. Run the web app first!</Text>}
      />
      <Button title="Add Task (Placeholder)" onPress={() => alert('Add task feature coming soon')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  taskItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  taskTitle: { fontSize: 16, fontWeight: 'bold' },
  taskStatus: { fontSize: 12, color: '#666' }
});