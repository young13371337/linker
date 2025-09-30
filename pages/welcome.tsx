import { FaLock, FaUserSecret, FaBolt } from "react-icons/fa";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Welcome() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0d0d0d, #1a1a1a)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10%" }}
    >
      <div className="content" style={{ maxWidth: 500 }}>
        <h1 style={{ fontSize: "3em", marginBottom: 10 }}>
          Linker <span style={{ background: "linear-gradient(90deg, #00bfff, #0077ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontWeight: "bold" }}>Social</span>
        </h1>
        <p style={{ fontSize: "1.2em", marginBottom: 40, color: "#cccccc" }}>
          Linker - полная анонимизация<br />
          Перед использованием рекомендуется прочесть
          <motion.a
            href="https://telegra.ph/Politika-konfidencialnosti-i-ispolzovaniya-servisa-Linker-09-27"
            style={{
              background: "linear-gradient(90deg, #00bfff, #0077ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: "bold",
              marginLeft: 6,
              textDecoration: "none",
              transition: "0.4s"
            }}
            whileHover={{
              scale: 1.08,
              color: "#0077ff"
            }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            условия и положения мессенджера</motion.a>
        </p>
        <Link href="/auth/register" passHref legacyBehavior>
          <motion.a
            className="btn"
            style={{ display: "inline-block", padding: "15px 40px", borderRadius: 35, fontSize: "1.2em", fontWeight: "bold", background: "linear-gradient(90deg, #00bfff, #0077ff)", color: "white", textDecoration: "none", transition: "0.3s", boxShadow: "0 5px 20px rgba(0, 191, 255, 0.4)" }}
            whileHover={{ scale: 1.07, boxShadow: "0 8px 25px rgba(0,191,255,0.6)" }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            Зарегистрироваться
          </motion.a>
        </Link>
      </div>
      <div className="features" style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 420 }}>
        <motion.div
          className="feature"
          style={{ background: "#1e1e1e", padding: 20, borderRadius: 15, display: "flex", alignItems: "center", gap: 15, boxShadow: "0 4px 15px rgba(0,0,0,0.5)", transition: "0.3s" }}
          whileHover={{ scale: 1.04, boxShadow: "0 8px 25px rgba(0,191,255,0.4)" }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <FaLock size={45} style={{ flexShrink: 0, color: "#00bfff", transition: "0.3s" }} />
          <div className="feature-text">
            <h3 style={{ margin: 0, fontSize: "1.3em" }}>Шифрование сообщений</h3>
            <p style={{ margin: "5px 0 0", color: "#aaaaaa", fontSize: "0.95em" }}>
              Ваши сообщения полностью защищены и недоступны третьим лицам.
            </p>
          </div>
        </motion.div>
        <motion.div
          className="feature"
          style={{ background: "#1e1e1e", padding: 20, borderRadius: 15, display: "flex", alignItems: "center", gap: 15, boxShadow: "0 4px 15px rgba(0,0,0,0.5)", transition: "0.3s" }}
          whileHover={{ scale: 1.04, boxShadow: "0 8px 25px rgba(0,191,255,0.4)" }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <FaUserSecret size={45} style={{ flexShrink: 0, color: "#00bfff", transition: "0.3s" }} />
          <div className="feature-text">
            <h3 style={{ margin: 0, fontSize: "1.3em" }}>Анонимность</h3>
            <p style={{ margin: "5px 0 0", color: "#aaaaaa", fontSize: "0.95em" }}>
              Никто не узнает, кто вы — общайтесь свободно и безопасно.
            </p>
          </div>
        </motion.div>
        <motion.div
          className="feature"
          style={{ background: "#1e1e1e", padding: 20, borderRadius: 15, display: "flex", alignItems: "center", gap: 15, boxShadow: "0 4px 15px rgba(0,0,0,0.5)", transition: "0.3s" }}
          whileHover={{ scale: 1.04, boxShadow: "0 8px 25px rgba(0,191,255,0.4)" }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <FaBolt size={45} style={{ flexShrink: 0, color: "#00bfff", transition: "0.3s" }} />
          <div className="feature-text">
            <h3 style={{ margin: 0, fontSize: "1.3em" }}>Мгновенная скорость</h3>
            <p style={{ margin: "5px 0 0", color: "#aaaaaa", fontSize: "0.95em" }}>
              Сообщения доставляются моментально, без задержек.
            </p>
          </div>
        </motion.div>
      </div>
      </motion.div>
  );
}
