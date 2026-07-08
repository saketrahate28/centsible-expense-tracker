import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sparkles, Send } from "lucide-react-native";

import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { Chip } from "@/src/components/ui";

type Msg = { role: "user" | "bot"; text: string };

const SUGGESTIONS = [
  "How much am I spending on food?",
  "What's a good SIP for me?",
  "Where can I cut back?",
  "Explain CIBIL score simply",
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);

  const loadHistory = useCallback(async () => {
    try {
      const r = await api.chatHistory();
      const msgs: Msg[] = [];
      for (const m of r.items || []) {
        msgs.push({ role: "user", text: m.user_text });
        msgs.push({ role: "bot", text: m.bot_text });
      }
      setMessages(msgs);
    } catch {}
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setSending(true);
    try {
      const r = await api.aiChat(msg, sessionId);
      setSessionId(r.session_id);
      setMessages((m) => [...m, { role: "bot", text: r.reply }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "bot", text: "Hit a snag — try again." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Sparkles color={theme.colors.ai} size={18} />
          </View>
          <View>
            <Text style={styles.title}>Cent</Text>
            <Text style={styles.subtitle}>Your finance coach · Online</Text>
          </View>
        </View>
      </View>

      <ScrollView
        testID="chat-scroll"
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={styles.welcome}>
            <View style={styles.welcomeIcon}>
              <Sparkles color={theme.colors.ai} size={28} />
            </View>
            <Text style={styles.welcomeTitle}>Hey, I&apos;m Cent 👋</Text>
            <Text style={styles.welcomeText}>
              Ask me anything about your money — budgeting, investing, credit, or just where your cash went this month.
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Chip
                  key={s}
                  testID={`suggest-${s.slice(0, 10)}`}
                  label={s}
                  onPress={() => send(s)}
                />
              ))}
            </View>
          </View>
        )}
        {messages.map((m, i) => (
          <View
            key={i}
            testID={`chat-msg-${i}`}
            style={[styles.msgRow, m.role === "user" ? styles.msgRowUser : styles.msgRowBot]}
          >
            <View style={m.role === "user" ? styles.bubbleUser : styles.bubbleBot}>
              <Text style={m.role === "user" ? styles.bubbleUserText : styles.bubbleBotText}>{m.text}</Text>
            </View>
          </View>
        ))}
        {sending && (
          <View style={styles.msgRowBot}>
            <View style={styles.bubbleBot}>
              <ActivityIndicator size="small" color={theme.colors.ai} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          testID="chat-input"
          style={styles.input}
          placeholder="Ask Cent about your money..."
          placeholderTextColor={theme.colors.textDisabled}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send()}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          testID="chat-send-btn"
          onPress={() => send()}
          disabled={!input.trim() || sending}
          style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.5 }]}
        >
          <Send color="#fff" size={18} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle, backgroundColor: theme.colors.bg },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(139,92,246,0.15)", alignItems: "center", justifyContent: "center" },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: "700" },
  subtitle: { color: theme.colors.success, fontSize: 12, fontWeight: "500" },

  messages: { padding: 16, gap: 8 },
  welcome: { alignItems: "center", padding: 24, marginTop: 24 },
  welcomeIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(139,92,246,0.15)", alignItems: "center", justifyContent: "center" },
  welcomeTitle: { color: theme.colors.text, fontSize: 22, fontWeight: "700", marginTop: 16 },
  welcomeText: { color: theme.colors.textSecondary, fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 21 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 20, justifyContent: "center" },

  msgRow: { marginVertical: 4, maxWidth: "85%" },
  msgRowUser: { alignSelf: "flex-end" },
  msgRowBot: { alignSelf: "flex-start" },
  bubbleUser: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.lg, borderTopRightRadius: 6, padding: 12, paddingHorizontal: 14 },
  bubbleUserText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  bubbleBot: {
    backgroundColor: "rgba(139,92,246,0.08)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.25)",
    borderRadius: theme.radius.lg, borderTopLeftRadius: 6, padding: 12, paddingHorizontal: 14,
  },
  bubbleBotText: { color: theme.colors.text, fontSize: 14, lineHeight: 20 },

  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.borderSubtle, backgroundColor: theme.colors.bg },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.borderSubtle,
    paddingHorizontal: 16, paddingVertical: 12,
    color: theme.colors.text, fontSize: 14, maxHeight: 120,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.ai, alignItems: "center", justifyContent: "center" },
});
