import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

export default function Register() {
  const { register } = useAuth();

  const [form, setForm] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    await register(form);
    alert("Registered!");
  };

  return (
    <Layout>
      <form onSubmit={submit}>
        <input placeholder="Name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button>Register</button>
      </form>
    </Layout>
  );
}