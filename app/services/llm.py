import json
from typing import Optional, List, Dict, Any
from openai import AsyncOpenAI
from app.core.config import settings

# Define appointment-related tools for OpenAI
APPOINTMENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_doctors",
            "description": "Recherche des médecins disponibles par spécialité. Utilisez cette fonction quand l'utilisateur veut prendre un rendez-vous et mentionne une spécialité ou demande les médecins disponibles.",
            "parameters": {
                "type": "object",
                "properties": {
                    "specialty": {
                        "type": "string",
                        "description": "Nom de la spécialité médicale recherchée (ex: cardiologie, pédiatrie, dermatologie)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_available_slots",
            "description": "Obtient les créneaux de rendez-vous disponibles pour un médecin ou une spécialité à une date donnée.",
            "parameters": {
                "type": "object",
                "properties": {
                    "doctor_id": {
                        "type": "string",
                        "description": "ID du médecin (optionnel si specialty est fourni)"
                    },
                    "specialty": {
                        "type": "string", 
                        "description": "Spécialité médicale (optionnel si doctor_id est fourni)"
                    },
                    "date": {
                        "type": "string",
                        "description": "Date souhaitée au format YYYY-MM-DD"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Réserve un rendez-vous pour le patient. Utilisez cette fonction uniquement quand vous avez toutes les informations nécessaires: médecin, date, heure, nom du patient, email et motif.",
            "parameters": {
                "type": "object",
                "properties": {
                    "doctor_id": {
                        "type": "string",
                        "description": "ID du médecin"
                    },
                    "date": {
                        "type": "string",
                        "description": "Date du rendez-vous au format YYYY-MM-DD"
                    },
                    "time": {
                        "type": "string",
                        "description": "Heure du rendez-vous au format HH:MM"
                    },
                    "patient_name": {
                        "type": "string",
                        "description": "Nom complet du patient"
                    },
                    "patient_email": {
                        "type": "string",
                        "description": "Email du patient"
                    },
                    "patient_phone": {
                        "type": "string",
                        "description": "Téléphone du patient (optionnel)"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Motif de la consultation"
                    }
                },
                "required": ["doctor_id", "date", "time", "patient_name", "patient_email", "reason"]
            }
        }
    }
]

class LLMService:
    def __init__(self):
        if settings.OPENAI_API_KEY:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.OPENAI_MODEL
        else:
            self.client = None
            self.model = None

    def _parse_history(self, history_str: str) -> List[Dict[str, str]]:
        """
        Parse the string history into OpenAI message format.
        History is expected to be in format:
        User: ...
        Assistant: ...
        System (Tool Output): ...
        """
        messages = []
        lines = history_str.strip().split('\n')
        
        current_role = None
        current_content = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if line.startswith("User:"):
                if current_role:
                    messages.append({"role": current_role, "content": " ".join(current_content)})
                current_role = "user"
                current_content = [line.replace("User:", "").strip()]
            elif line.startswith("Assistant:"):
                if current_role:
                    messages.append({"role": current_role, "content": " ".join(current_content)})
                current_role = "assistant"
                current_content = [line.replace("Assistant:", "").strip()]
            elif line.startswith("System (Tool Output"):
                if current_role:
                    messages.append({"role": current_role, "content": " ".join(current_content)})
                
                # Extract content removing the prefix
                content = line.split("):", 1)[1].strip() if "):" in line else line
                
                current_role = "system" 
                current_content = ["Tool output from previous turn: " + content]
            else:
                if current_role:
                    current_content.append(line)
        
        if current_role:
            messages.append({"role": current_role, "content": " ".join(current_content)})
            
        return messages

    async def generate_response_with_tools(
        self, 
        system_instruction: str, 
        context: str, 
        history: str, 
        user_message: str
    ) -> Dict[str, Any]:
        """
        Generate response with potential function calls for appointment booking.
        Returns a dict with:
        - 'type': 'text' or 'function_call'
        - 'content': text response or function call details
        """
        if not self.client:
            return {"type": "text", "content": "OpenAI API Key not configured. Mock response."}
        
        messages = [
            {"role": "system", "content": f"{system_instruction}\n\nContext from Knowledge Base:\n{context}"}
        ]
        
        # Add history
        # Note: In a real production system, we should store structured messages in DB
        # instead of parsing a string history. This is an adaptation layer.
        parsed_history = self._parse_history(history)
        messages.extend(parsed_history)
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=APPOINTMENT_TOOLS,
                tool_choice="auto"
            )
            
            message = response.choices[0].message
            
            # Check for tool calls
            if message.tool_calls:
                tool_call = message.tool_calls[0]
                return {
                    "type": "function_call",
                    "content": {
                        "name": tool_call.function.name,
                        "args": json.loads(tool_call.function.arguments)
                    }
                }
            
            return {"type": "text", "content": message.content or "Je n'ai pas compris."}
            
        except Exception as e:
            return {"type": "text", "content": f"Error generating response: {str(e)}"}

    async def continue_with_function_result(
        self,
        system_instruction: str,
        function_name: str,
        function_result: str
    ) -> Dict[str, Any]:
        """
        Continue the conversation after executing a function call.
        """
        if not self.client:
            return {"type": "text", "content": "OpenAI API Key not configured."}
        
        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "system", "content": f"System (Tool '{function_name}' Output): {function_result}"},
            {"role": "user", "content": "Continue la conversation en te basant sur ce résultat. Si c'est une liste de créneaux, propose-les clairement."}
        ]
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages
            )
            
            message = response.choices[0].message
             
            # Check for MORE tool calls (nested)
            if message.tool_calls:
                tool_call = message.tool_calls[0]
                return {
                    "type": "function_call",
                    "content": {
                        "name": tool_call.function.name,
                        "args": json.loads(tool_call.function.arguments)
                    }
                }
            
            return {"type": "text", "content": message.content}
            
        except Exception as e:
            return {"type": "text", "content": f"Error: {str(e)}"}
